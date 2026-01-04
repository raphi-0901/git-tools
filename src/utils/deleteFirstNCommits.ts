import { BaseCommand } from "../base-commands/BaseCommand.js";
import { getSimpleGit } from "./getSimpleGit.js";
import * as LOGGER from "./logging.js";


export async function deleteFirstNCommits(
    ctx: BaseCommand,
    commitsToDelete: number,
) {
    const git = getSimpleGit();
    const branchName = (await git.branch()).current;

    // Count commits on the branch
    const commitCount = Number.parseInt(
        (await git.raw(["rev-list", "--count", "HEAD"])).trim(),
        10
    );

    if (commitCount < commitsToDelete) {
        LOGGER.debug(ctx, `Skipping ${branchName}: not enough commits`);
        return;
    }

    LOGGER.debug(
        ctx,
        `Deleting first ${commitsToDelete} commits out of ${commitCount} on ${branchName}`
    );

    // Determine new root commit (skip first N commits)
    const commits = (
        await git.raw(["rev-list", "--reverse", "HEAD"])
    )
        .trim()
        .split("\n");

    const newRoot = commits[commitsToDelete];
    await git.reset(["--hard", newRoot]);
}
