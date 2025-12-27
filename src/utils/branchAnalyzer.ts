import { BranchAnalysisResult } from "../types/BranchAnalysisResult.js";
import { selectMostRelevantBranch } from "./branchScoring.js";
import { getRemoteStatus } from "./getRemoteStatus.js";
import { findMergeTargets } from "./mergeDetection.js";

export async function analyzeBranches(
    branches: string[],
    potentialTargets: string[],
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
        const days = (Date.now() - lastCommitDate) / 86_400_000;

        if (!hasRemote) {
            result.localOnly.set(branch, lastCommitDate);
        } else if (ahead > 0 && behind > 0 && days > 30) {
            result.diverged.set(branch, { ahead, behind, lastCommitDate });
        } else if (behind > 0 && ahead === 0) {
            result.behindOnly.set(branch, { behindCount: behind, lastCommitDate });
        } else if (ahead === 0 && behind === 0 && days > 30) {
            result.stale.set(branch, lastCommitDate);
        }
    }));

    return result;
}
