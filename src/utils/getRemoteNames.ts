import { getSimpleGit } from "./getSimpleGit.js";

export async function getRemoteNames(): Promise<string[]> {
    const git = getSimpleGit();

    return (await git.getRemotes()).map((remote) => remote.name);
}
