import { simpleGit } from "simple-git";

export async function checkIfFilesStaged() {
    const git = simpleGit();
    const diff = await git.diff([ '--cached']);

    return diff.trim().length > 0;
}
