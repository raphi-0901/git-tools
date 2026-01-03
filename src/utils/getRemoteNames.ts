import { getSimpleGit } from "./getSimpleGit.js";

/**
 * Retrieves the names of all configured git remotes.
 *
 * @returns A promise that resolves to an array of remote names.
 */
export async function getRemoteNames(): Promise<string[]> {
    const git = getSimpleGit();

    return (await git.getRemotes()).map((remote) => remote.name);
}
