import { getSimpleGit } from "./getSimpleGit.js";

export async function checkIfCommitExists(hash: string) {
    const git = getSimpleGit();

    try {
        await git.revparse([hash]);
        return true;
    } catch {
        return false;
    }
}
