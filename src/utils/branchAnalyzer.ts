import dayjs from "dayjs";

import { BranchAnalysisResult } from "../types/BranchAnalysisResult.js";
import { calculateAbsoluteDayDifference } from "./calculateAbsoluteDayDifference.js";
import { getRemoteStatus } from "./getRemoteStatus.js";
import { findMergeTargets } from "./mergeDetection.js";

/**
 * Analyzes a list of branches to categorize them based on merge status,
 * remote synchronization, and staleness.
 *
 * Categories include:
 * - `merged`: Branches already merged into one or more potential target branches.
 * - `diverged`: Branches ahead and behind the remote with last commit older than `staleDays` days.
 * - `behindOnly`: Branches behind the remote with no local commits ahead.
 * - `localOnly`: Branches with no remote counterpart.
 * - `stale`: Branches fully up-to-date with remote but with last commit older than `staleDays` days.
 *
 * @param branches - List of branch names to analyze
 * @param potentialTargets - Branches to consider for merge detection
 * @param staleDays - Number of days after which branches are considered stale
 * @param lastCommitCache - Map of branch name → last commit timestamp (ms)
 * @param importance - Map of branch name → importance score for selecting the most relevant merge target
 * @returns A promise resolving to a `BranchAnalysisResult` categorizing all input branches
 */
export async function analyzeBranches(
    branches: string[],
    potentialTargets: string[],
    staleDays: number,
    lastCommitCache: Map<string, number>,
    importance: Map<string, number>
): Promise<BranchAnalysisResult> {
    const result: BranchAnalysisResult = {
        behindOnly: new Map(),
        diverged: new Map(),
        localOnly: new Map(),
        merged: new Map(),
        stale: new Map(),
    };

    await Promise.all(branches.map(async (branch) => {
        const mergedInto = await findMergeTargets(branch, potentialTargets);
        const lastCommitDate = lastCommitCache.get(branch) ?? 0;

        if (mergedInto.length > 0) {
            result.merged.set(branch, {
                lastCommitDate,
                mergedIntoBranches: mergedInto,
                mostRelevantBranch: selectMostRelevantBranch(mergedInto, importance)
            });
            return;
        }

        const { ahead, behind, hasRemote } = await getRemoteStatus(branch);
        const daysSinceLastCommit = calculateAbsoluteDayDifference(lastCommitDate, Date.now())
        
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
            return
        }

        if (ahead === 0 && behind === 0 && daysSinceLastCommit > staleDays) {
            result.stale.set(branch, lastCommitDate);
        }
    }));

    return result;
}

/**
 * Selects the most relevant branch from a list based on a scoring map.
 *
 * @param branches - List of branch names to choose from
 * @param scoreMap - Map of branch name → numeric score indicating importance
 * @returns The branch with the highest score; if multiple branches have the same score, the first is returned
 */
function selectMostRelevantBranch(
    branches: string[],
    scoreMap: Map<string, number>
): string {
    return branches.reduce((best, current) =>
        (scoreMap.get(current) ?? 0) > (scoreMap.get(best) ?? 0)
            ? current
            : best
    );
}
