import { getSimpleGit } from "./getSimpleGit.js";

/**
 * Retrieves the timestamp of the most recent commit on a given Git branch.
 *
 * The commit date is read directly from Git and returned as a Unix timestamp
 * in milliseconds since epoch.
 *
 * @param branch - The name of the branch to inspect (e.g. `"main"` or `"origin/feature/foo"`)
 * @returns A promise resolving to the commit date as milliseconds since epoch
 * @throws If the Git command fails (e.g. branch does not exist)
 */
export async function getLastCommitDate(branch: string): Promise<number> {
    const git = getSimpleGit();
    const raw = await git.raw(["log", branch, "-n", "1", "--pretty=format:%ai"]);
    return new Date(raw.trim()).getTime();
}
