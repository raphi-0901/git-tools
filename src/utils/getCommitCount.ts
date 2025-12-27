import { getSimpleGit } from "./getSimpleGit.js";

/**
 * Retrieves the total number of commits on a given Git branch.
 *
 * This uses `git rev-list --count` to determine how many commits
 * exist on the branch.
 *
 * @param branch - The name of the branch to inspect (e.g., `"main"` or `"feature/foo"`)
 * @returns A promise resolving to the number of commits on the branch
 * @throws If the Git command fails (e.g., branch does not exist)
 */
export async function getCommitCount(branch: string): Promise<number> {
    const git = getSimpleGit();
    const commitCountRaw = await git.raw(["rev-list", "--count", branch]);
    return Number.parseInt(commitCountRaw, 10);
}
