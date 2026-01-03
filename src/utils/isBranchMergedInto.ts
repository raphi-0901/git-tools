import { getSimpleGit } from "./getSimpleGit.js";

export async function isBranchMergedInto(sourceBranch: string, targetBranch: string): Promise<boolean> {
    const git = getSimpleGit();
    try {
        const result = await git.raw(["log", `${targetBranch}..${sourceBranch}`, "--oneline"]);
        return result.trim() === "";
    } catch {
        return false;
    }
}
