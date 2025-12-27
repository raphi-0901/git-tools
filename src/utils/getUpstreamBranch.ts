import { getSimpleGit } from "./getSimpleGit.js";

export async function getUpstreamBranch(
    branch: string
): Promise<null | string> {
    const git = getSimpleGit();

    try {
        const result = await git.raw([
            "rev-parse",
            "--abbrev-ref",
            "--symbolic-full-name",
            `${branch}@{u}`,
        ]);

        return result.trim();
    } catch {
        // no upstream configured
        return null;
    }
}
