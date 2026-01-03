import { getRemoteNames } from "./getRemoteNames.js";
import { getSimpleGit } from "./getSimpleGit.js";

export type RemoteStatus = {
    ahead: number;
    behind: number;
    hasRemote: boolean;
    remoteBranch: null | string;
};

/**
 * Determines the synchronization status of a local Git branch
 * relative to its corresponding remote branch.
 *
 * Returns the number of commits the local branch is ahead/behind,
 * whether a remote exists, and the remote branch name.
 *
 * @param branch - The name of the local branch to check (e.g., `"main"`)
 *
 * @returns A promise resolving to the remote synchronization status
 */
export async function getRemoteStatus(branch: string): Promise<RemoteStatus[]> {
    const git = getSimpleGit();

    const remoteNames = await getRemoteNames()
    const remoteBranches = remoteNames.map(remote => `${remote}/${branch}`);

    return Promise.all(
        remoteBranches.map(async (remoteBranch) => {
            try {
                const status = await git.raw([
                    "rev-list",
                    "--left-right",
                    "--count",
                    `${branch}...${remoteBranch}`
                ]);

                const [ahead, behind] = status.trim().split("\t").map(Number);
                return {
                    ahead,
                    behind,
                    hasRemote: true,
                    remoteBranch
                };
            } catch {
                return {
                    ahead: 0,
                    behind: 0,
                    hasRemote: false,
                    remoteBranch: null
                };
            }
        })
    );
}
