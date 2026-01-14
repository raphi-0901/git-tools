import { getSimpleGit } from "./getSimpleGit.js";

/**
 * Checks whether a source branch has been fully merged into a target branch.
 *
 * @param sourceBranch The name of the branch to check for merging.
 * @param targetBranch The name of the branch to check against.
 * @returns A promise that resolves to `true` if the source branch is fully merged
 *          into the target branch, or `false` otherwise.
 */
export async function isBranchMergedInto(
    sourceBranch: string,
    targetBranch: string
): Promise<boolean> {
    const git = getSimpleGit();

    try {
        const mergedBranches = await git.branch(['--merged', targetBranch]);
        return mergedBranches.all.includes(sourceBranch);
    } catch {
        return false;
    }
}
