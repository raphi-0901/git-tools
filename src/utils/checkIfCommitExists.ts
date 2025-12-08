import { simpleGit } from 'simple-git';

export async function checkIfCommitExists(hash: string) {
    const git = simpleGit();

    try {
        await git.revparse([hash]);
        return true;
    } catch {
        return false;
    }
}
