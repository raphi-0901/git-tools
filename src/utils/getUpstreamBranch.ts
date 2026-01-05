import { getSimpleGit } from "./getSimpleGit.js";

/**
 * Retrieves the upstream branch name for a given local branch.
 *
 * @param {string} branch - The name of the local branch.
 * @returns {Promise<string | null>} A promise that resolves to the upstream branch name as a string,
 *                                   or `null` if the branch has no upstream configured.
 *
 * @example
 * const upstream = await getUpstreamBranch('main');
 * if (upstream) {
 *   console.log(`Upstream branch: ${upstream}`);
 * } else {
 *   console.log('No upstream branch configured.');
 * }
 */
export async function getUpstreamBranch(branch: string): Promise<null | string> {
    const git = getSimpleGit();

    try {
        return await git.raw([
            'rev-parse',
            '--symbolic-full-name',
            '--abbrev-ref',
            `${branch}@{u}`
        ]);
    } catch {
        return null;
    }
}
