import { getSimpleGit } from "./getSimpleGit.js";

/**
 * Checks if there are any files staged for commit in the current Git repository.
 *
 * @returns {Promise<boolean>} `true` if there are staged changes, `false` otherwise.
 *
 * @example
 * const hasStaged = await checkIfFilesStaged();
 * if (hasStaged) {
 *   console.log("There are files staged for commit");
 * } else {
 *   console.log("No files are staged");
 * }
 *
 * @remarks
 * This only checks the index (staged files) and ignores unstaged changes.
 */
export async function checkIfFilesStaged(): Promise<boolean> {
    const git = getSimpleGit();
    const diff = await git.diff(['--cached']);

    return diff.trim().length > 0;
}
