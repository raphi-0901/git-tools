import { getSimpleGit } from "./getSimpleGit.js";

export type RemoteStatus = {
    ahead: number
    behind: number
    hasRemote: boolean
}

/**
 * Determines the synchronization status of a local Git branch
 * relative to its corresponding `origin/<branch>` remote branch.
 *
 * If the remote branch exists, the function reports how many commits
 * the local branch is ahead of or behind the remote. If the remote
 * branch does not exist, `hasRemote` is set to `false` and both
 * counters are `0`.
 *
 * @param branch - The name of the local branch to check (e.g. `"main"`)
 * @returns A promise resolving to the remote synchronization status
 */
export async function getRemoteStatus(branch: string): Promise<RemoteStatus> {
    const git = getSimpleGit();
    try {
        await git.raw(["rev-parse", "--verify", `origin/${branch}`]);
        const status = await git.raw([
            "rev-list",
            "--left-right",
            "--count",
            `${branch}...origin/${branch}`
        ]);

        const [ahead, behind] = status
            .trim()
            .split("\t")
            .map(n => Number.parseInt(n, 10));

        return { ahead, behind, hasRemote: true };
    } catch {
        return { ahead: 0, behind: 0, hasRemote: false };
    }
}
