/**
 * Removes remote prefixes from a branch name
 * (e.g., "origin/feature/login" -> "feature/login")
 *
 * @param {string} branch - Branch name
 * @param {string[]} remotes - List of remote names
 * @returns {string} Normalized branch name
 */
export function stripRemotePrefix(branch: string, remotes: string[]): string {
    for (const remote of remotes) {
        if (branch.startsWith(`${remote}/`)) {
            return branch.slice(remote.length + 1);
        }
    }

    return branch;
}
