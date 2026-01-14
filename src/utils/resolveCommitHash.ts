import { getSimpleGit } from "./getSimpleGit.js";

/**
 * Resolves a commit hash.
 *
 * @param hash - Full or abbreviated commit hash
 * @returns The resolved full commit hash, or null if not found
 */
export async function resolveCommitHash(
    hash: string
): Promise<null | string> {
    const git = getSimpleGit();

    try {
        const fullHash = await git.revparse([`${hash}^{commit}`]);
        return fullHash.trim();
    } catch {
        return null;
    }
}
