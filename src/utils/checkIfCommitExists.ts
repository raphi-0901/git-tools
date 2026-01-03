import { getSimpleGit } from "./getSimpleGit.js";

/**
 * Checks if a given Git commit hash exists in the current repository.
 *
 * @param {string} hash - The commit hash to check.
 * @returns {Promise<boolean>} `true` if the commit exists, `false` otherwise.
 *
 * @example
 * const exists = await checkIfCommitExists("a1b2c3d");
 * if (exists) {
 *   console.log("Commit exists in the repository");
 * } else {
 *   console.log("Commit not found");
 * }
 */
export async function checkIfCommitExists(hash: string): Promise<boolean> {
    const git = getSimpleGit();

    try {
        await git.revparse([hash]);
        return true;
    } catch {
        return false;
    }
}
