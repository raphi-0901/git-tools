import { getUpstreamBranch } from "../utils/getUpstreamBranch.js";
import { isBranchMergedInto } from "../utils/isBranchMergedInto.js";

/**
 * Finds the first branch from a list of potential targets into which
 * the source branch has already been merged.
 *
 * The function skips:
 * - The source branch itself
 * - Its upstream branch (if any)
 *
 * @param sourceBranch - The branch to check for merges from
 * @param potentialTargets - List of branches to consider as potential merge targets
 * @returns The first branch name into which the source branch has been merged,
 *          or `null` if none of the targets contain the merge
 */
export async function findMergeTargets(
    sourceBranch: string,
    branchUpstream: null | string,
    potentialTargets: string[]
) {

    for (const target of potentialTargets) {
        if (target === sourceBranch) {
            continue;
        }

        if (branchUpstream && target === branchUpstream) {
            continue;
        }

        if (await isBranchMergedInto(sourceBranch, target)) {
            return target;
        }
    }

    return null;
}
