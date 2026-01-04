import { BaseCommand } from "../base-commands/BaseCommand.js";
import { deleteFirstNCommits } from "./deleteFirstNCommits.js";
import { getSimpleGit } from "./getSimpleGit.js";
import * as LOGGER from "./logging.js";
import { rewordLastCommitMessage } from "./rewordLastCommitMessage.js";

/**
 * Randomly deletes the first N commits on a branch and rewords the last commit
 * to intentionally diverge its history.
 *
 * - Ensures the branch exists locally before proceeding.
 * - Keeps at least 2 commits to prevent empty history.
 * - Amends the last commit message by appending `(rw)`.
 *
 * @param ctx The command context used for logging.
 * @param branchName The name of the branch to modify.
 * @throws Will throw an error if the branch does not exist locally.
 */
export async function randomlyDeleteFirstNCommitsAndRewordLastCommitForDivergence(
    ctx: BaseCommand,
    branchName: string
) {
    const git = getSimpleGit();

    LOGGER.log(ctx, `Checking out branch ${branchName}`);
    try {
        await git.checkout(branchName);
    }
    catch (error) {
        LOGGER.fatal(ctx, `Failed to checkout branch ${branchName}: ${error}`);
    }

    // Count commits on the branch
    const commitCount = Number.parseInt(
        (await git.raw(["rev-list", "--count", "HEAD"])).trim(),
        10
    );

    if (commitCount < 3) {
        LOGGER.log(ctx, `Skipping ${branchName}: not enough commits`);
        return;
    }

    // Randomly choose N (keep at least 2 commits)
    const maxDeletable = commitCount - 2;
    const N = Math.floor(Math.random() * maxDeletable) + 1;

    await deleteFirstNCommits(ctx, N);
    await rewordLastCommitMessage(ctx, (oldMessage) => oldMessage + " (rw)");
}
