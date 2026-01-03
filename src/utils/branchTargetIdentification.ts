import { isProtectedBranch } from "./branchProtection.js";
import { calculateAbsoluteDayDifference } from "./calculateAbsoluteDayDifference.js";
import { getRemoteNames } from "./getRemoteNames.js";

type BranchTargetIdentificationOptions = {
    /** List of all branches in the repository */
    allBranches: string[];

    /** Map of branch name -> commit count */
    branchToCommitCountCache: Map<string, number>;

    /** Map of branch name -> last commit timestamp in milliseconds */
    branchToLastCommitDateCache: Map<string, number>;

    /** Regular expression patterns for protected branches */
    protectedBranchPatterns: readonly RegExp[];
};

type BranchSignals = {
    commitCount: number;
    daysSinceLastCommit: number;
    isProtected: boolean;
    normalizedName: string;
};

const SCORE = {
    COMMIT_LOG_SCALE: 100,

    DEVELOP: 4000,
    FEATURE_PENALTY: -500,
    MAIN: 5000,
    MAX_RESULTS: 5,
    MIN_SCORE: 1000,

    PROTECTED: 10_000,
    RECENCY_MAX: 500,

    RELEASE: 2000,
    STAGING: 3000,
} as const;

const NAME_RULES: Array<[RegExp, number]> = [
    [/^(main|master|production|prod)$/i, SCORE.MAIN],
    [/^(development|develop|dev)$/i, SCORE.DEVELOP],
    [/^(staging|stage)$/i, SCORE.STAGING],
    [/^(release|hotfix)\//i, SCORE.RELEASE],
    [/^(feature|feat)\//i, SCORE.FEATURE_PENALTY],
];

/**
 * Identifies and ranks potential target branches (e.g., merge or base branches)
 * based on repository activity, naming conventions, and protection rules.
 */
export async function identifyPotentialTargetBranches(
    options: BranchTargetIdentificationOptions
): Promise<string[]> {
    const { allBranches, branchToCommitCountCache, branchToLastCommitDateCache, protectedBranchPatterns } = options;

    const remoteNames = await getRemoteNames();

    // 1. Map branches to their scores and normalized names
    return allBranches.reduce((acc, branch) => {
            const normalizedName = stripRemotePrefix(branch, remoteNames);

            const commitCount = branchToCommitCountCache.get(branch) ?? 0;
            const lastCommitTimestamp = branchToLastCommitDateCache.get(branch) ?? 0;

            const daysSinceLastCommit = calculateAbsoluteDayDifference(lastCommitTimestamp, Date.now());

            const signals: BranchSignals = {
                commitCount,
                daysSinceLastCommit,
                isProtected: isProtectedBranch(normalizedName, protectedBranchPatterns),
                normalizedName,
            };

            const score = scoreBranch(signals);

            // Keep the branch only if it's the first time seeing the name
            // or if it has a higher score than the one currently stored.
            const existing = acc.get(normalizedName);
            if (!existing || score > existing.score) {
                acc.set(normalizedName, { branch, score });
            }

            return acc;
        }, new Map<string, { branch: string; score: number }>()
    )
        .values()
        .toArray()
        .filter(({ score }) => score >= SCORE.MIN_SCORE)
        .sort((a, b) => b.score - a.score)
        .slice(0, SCORE.MAX_RESULTS)
        .map(({ branch }) => branch);
}

/* ------------------------ helpers ------------------------ */
function stripRemotePrefix(branch: string, remotes: string[]): string {
    for (const remote of remotes) {
        if (branch.startsWith(`${remote}/`)) {
            return branch.slice(remote.length + 1);
        }
    }

    return branch;
}

function scoreBranch(signals: BranchSignals): number {
    let score = 0;

    if (signals.isProtected) {
        score += SCORE.PROTECTED;
    }

    // Commit volume (log-scaled)
    score += Math.log(signals.commitCount + 1) * SCORE.COMMIT_LOG_SCALE;

    // Recency (recent commits are better)
    score += Math.max(
        0,
        SCORE.RECENCY_MAX - signals.daysSinceLastCommit
    );

    // Naming conventions
    for (const [pattern, value] of NAME_RULES) {
        if (pattern.test(signals.normalizedName)) {
            score += value;
            break;
        }
    }

    return score;
}
