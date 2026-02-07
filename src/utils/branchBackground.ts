import { IssueSummary, IssueSummarySchema } from "../types/IssueSummary.js";
import { getSimpleGit } from "./getSimpleGit.js";



export async function getBranchBackground(): Promise<IssueSummary | null> {
    const git = getSimpleGit();

    const branch = (await git.branch()).current;
    try {
        const raw = await git.getConfig(`branch.${branch}.background`, 'local');
        return IssueSummarySchema.parse(JSON.parse(raw.value || ""))
    } catch {
        return null;
    }
}

export async function setBranchBackground(data: IssueSummary) {
    const validated = IssueSummarySchema.safeParse(data);
    if(!validated.success) {
        // silently fail
        return;
    }

    const git = getSimpleGit();
    const branch = (await git.branch()).current;
    await git.addConfig(
        `branch.${branch}.background`,
        JSON.stringify(validated.data),
        false,
        'local'
    );
}
