import { getSimpleGit } from "./getSimpleGit.js";

/**
 * Retrieves an overview of all Git branches in the current repository.
 *
 * The result includes:
 * - all branches (local and remote, as returned by `git branch -a`)
 * - local branches
 * - remote branches (without the `remotes/` prefix)
 *
 * @returns An object containing all, local, and remote branch names.
 */
export async function getBranchesSummary(): Promise<{
    allBranches: string[];
    localBranches: string[];
    remoteBranches: string[];
}> {
    const git = getSimpleGit();

    const allBranches = (await git.branch(["-a"])).all;
    const localBranches: string[] = [];
    const remoteBranches: string[] = [];

    for (const branch of allBranches) {
        if(branch.startsWith('remotes/')) {
            remoteBranches.push(branch.replace('remotes/', ''));
        } else {
            localBranches.push(branch);
        }
    }

    return {
        allBranches,
        localBranches,
        remoteBranches
    }
}
