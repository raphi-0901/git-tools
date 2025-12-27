import { getUpstreamBranch } from "../utils/getUpstreamBranch.js";
import { isBranchMergedInto } from "../utils/isBranchMergedInto.js";

/**
 * Finds which branches a source branch has already been merged into.
 *
 * The function skips:
 * - The source branch itself
 * - Its upstream branch (if any)
 *
 * @param sourceBranch - The branch to check for merges from
 * @param potentialTargets - List of branches to consider as potential merge targets
 * @returns A promise resolving to an array of branch names into which the source branch has been merged
 */
export async function findMergeTargets(
    sourceBranch: string,
    potentialTargets: string[]
): Promise<string[]> {
    const mergedInto: string[] = [];
    const upstream = await getUpstreamBranch(sourceBranch);

    for (const target of potentialTargets) {
        if (target === sourceBranch) {
            continue;
        }

        if (upstream && target === upstream) {
            continue;
        }

        if (await isBranchMergedInto(sourceBranch, target)) {
            mergedInto.push(target);
        }
    }

    return mergedInto;
}
