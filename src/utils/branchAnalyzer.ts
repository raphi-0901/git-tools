import { BranchAnalysisResult } from "../types/BranchAnalysisResult.js";
import { calculateAbsoluteDayDifference } from "./calculateAbsoluteDayDifference.js";
import { getRemoteStatus } from "./getRemoteStatus.js";
import { isBranchMergedInto } from "./isBranchMergedInto.js";

interface AnalyzeBranchesOptions {
    /** List of branch names to analyze */
    branches: string[];
    /** Map of branch name → last commit timestamp in milliseconds */
    lastCommitCache: Map<string, number>;
    /** Branches to consider as potential merge targets */
    potentialTargets: string[];
    /** Number of days after which a branch is considered stale */
    staleDays: number;
}

/**
 * Analyzes a list of branches and categorizes them according to:
 *
 * 1. **Merged**: Branches already merged into one or more target branches.
 * 2. **Diverged**: Branches ahead and behind the remote with last commit older than `staleDays`.
 * 3. **Behind Only**: Branches behind the remote with no local commits ahead.
 * 4. **Local Only**: Branches with no remote counterpart and older than `staleDays`.
 * 5. **Stale**: Branches fully up-to-date with remote but with last commit older than `staleDays`.
 *
 * The function uses last commit dates, remote tracking status, and merge target analysis
 * to determine the correct categorization for each branch.
 *
 * @param options - Object containing all options for branch analysis
 * @param options.branches - List of branch names to analyze
 * @param options.potentialTargets - Branches to consider for merge detection
 * @param options.staleDays - Number of days after which branches are considered stale
 * @param options.lastCommitCache - Map of branch name → last commit timestamp (ms)
 *
 * @returns Promise that resolves to a `BranchAnalysisResult`, a categorization map containing:
 *          - `merged`: Map of branch → { lastCommitDate, mergedIntoBranches, mostRelevantBranch }
 *          - `diverged`: Map of branch → { ahead, behind, lastCommitDate }
 *          - `behindOnly`: Map of branch → { behind, lastCommitDate }
 *          - `localOnly`: Map of branch → lastCommitDate
 *          - `stale`: Map of branch → lastCommitDate
 */
export async function analyzeBranches(options: AnalyzeBranchesOptions): Promise<BranchAnalysisResult> {
    const { branches, lastCommitCache, potentialTargets, staleDays } = options;
    const now = Date.now();

    const result: BranchAnalysisResult = {
        behindOnly: new Map(),
        diverged: new Map(),
        localOnly: new Map(),
        merged: new Map(),
        stale: new Map(),
    };

    await Promise.all(branches.map(async (branch) => {
        const lastCommitDate = lastCommitCache.get(branch) ?? 0;
        const daysSinceLastCommit = calculateAbsoluteDayDifference(lastCommitDate, now);

        let mergedInto: string = "";
        const { ahead, behind, hasRemote, remoteBranch } = await getRemoteStatus(branch);
        for (const target of potentialTargets) {
            if (target === remoteBranch) {
                continue;
            }

            if (remoteBranch && target === remoteBranch) {
                continue;
            }

            if (await isBranchMergedInto(branch, target)) {
                mergedInto = target;
                break;
            }
        }

        if (mergedInto.length > 0) {
            result.merged.set(branch, {
                lastCommitDate,
                mergedInto,
            });
            return;
        }

        if (!hasRemote && daysSinceLastCommit > staleDays) {
            result.localOnly.set(branch, lastCommitDate);
            return;
        }

        if (ahead > 0 && behind > 0 && daysSinceLastCommit > staleDays) {
            result.diverged.set(branch, { ahead, behind, lastCommitDate });
            return;
        }

        if (behind > 0 && ahead === 0) {
            result.behindOnly.set(branch, { behind, lastCommitDate });
            return;
        }

        if (ahead === 0 && behind === 0 && daysSinceLastCommit > staleDays) {
            result.stale.set(branch, lastCommitDate);
        }
    }));

    return result;
}
