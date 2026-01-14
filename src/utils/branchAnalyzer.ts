import BranchCleanupCommand from "../commands/branch-cleanup/index.js";
import { BehindInfo } from "../types/BehindInfo.js";
import { DivergedInfo } from "../types/DivergedInfo.js";
import { MergeInfo } from "../types/MergeInfo.js";
import { calculateAbsoluteDayDifference } from "./calculateAbsoluteDayDifference.js";
import { isBranchMergedInto } from "./isBranchMergedInto.js";

export type BranchAnalysisResult = {
    behindOnly: Map<string, BehindInfo>;
    diverged: Map<string, DivergedInfo>;
    localOnly: Map<string, number>;
    merged: Map<string, MergeInfo>;
    stale: Map<string, number>;
};

type AnalyzeBranchesOptions = {
    /** List of branch names to analyze */
    branches: string[];

    /** Branches to consider as potential merge targets */
    potentialTargets: string[];
}

/**
 * Analyzes local branches and classifies them into cleanup-related categories
 * based on merge status, remote tracking state, and inactivity thresholds.
 *
 * Branches are evaluated in the following order:
 *
 * 1. **Merged** – Branches that are already merged into one of the given target branches.
 * 2. **Local Only** – Branches without a remote counterpart whose last commit is older
 *    than `staleDaysLocal`.
 * 3. **Diverged** – Branches that are both ahead of and behind their remote counterpart,
 *    with the last commit older than `staleDaysDiverged`.
 * 4. **Behind Only** – Branches that are only behind their remote (no local commits ahead),
 *    with the last commit older than `staleDays`.
 * 5. **Stale** – Branches fully in sync with their remote, but inactive for more than
 *    `staleDays`.
 *
 * The analysis relies on cached last-commit timestamps, remote tracking metadata,
 * and merge detection against potential target branches.
 *
 * @param ctx - Branch cleanup command context containing caches and user configuration
 * @param options - Options controlling which branches are analyzed
 * @param options.branches - Local branch names to analyze
 * @param options.potentialTargets - Branches considered as merge targets
 *
 * @returns A promise resolving to a {@link BranchAnalysisResult} containing categorized branches:
 * - `merged`: Map of branch → `{ lastCommitDate, mergedInto }`
 * - `localOnly`: Map of branch → `lastCommitDate`
 * - `diverged`: Map of branch → `{ ahead, behind, lastCommitDate }`
 * - `behindOnly`: Map of branch → `{ behind, lastCommitDate }`
 * - `stale`: Map of branch → `lastCommitDate`
 */
export async function analyzeBranches(ctx: BranchCleanupCommand, options: AnalyzeBranchesOptions): Promise<BranchAnalysisResult> {
    const { localBranchToLastCommitDateCache, localBranchToRemoteStatusCache, userConfig } = ctx;
    const { branches, potentialTargets } = options;
    const { staleDays, staleDaysBehind, staleDaysDiverged, staleDaysLocal } = userConfig
    const now = Date.now();

    const result: BranchAnalysisResult = {
        behindOnly: new Map(),
        diverged: new Map(),
        localOnly: new Map(),
        merged: new Map(),
        stale: new Map(),
    };

    await Promise.all(branches.map(async (branch) => {
        const lastCommitDate = localBranchToLastCommitDateCache.get(branch) ?? 0;
        const daysSinceLastCommit = calculateAbsoluteDayDifference(lastCommitDate, now);

        let mergedInto: string = "";
        const { ahead, behind, hasRemote, remoteBranch } = localBranchToRemoteStatusCache.get(branch) ?? {
            ahead: 0,
            behind: 0,
            hasRemote: false,
            remoteBranch: null
        };

        for (const target of potentialTargets) {
            if (target === branch) {
                continue;
            }

            if (remoteBranch === target) {
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

        if (!hasRemote && daysSinceLastCommit > staleDaysLocal) {
            result.localOnly.set(branch, lastCommitDate);
            return;
        }

        if (ahead > 0 && behind > 0 && daysSinceLastCommit > staleDaysDiverged) {
            result.diverged.set(branch, { ahead, behind, lastCommitDate });
            return;
        }

        if (behind > 0 && ahead === 0 && daysSinceLastCommit > staleDaysBehind) {
            result.behindOnly.set(branch, { behind, lastCommitDate });
            return;
        }

        if (ahead === 0 && behind === 0 && daysSinceLastCommit > staleDays) {
            result.stale.set(branch, lastCommitDate);
        }
    }));

    return result;
}
