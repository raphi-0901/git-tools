import { BaseCommand } from "../base-commands/BaseCommand.js";
import { getSimpleGit } from "./getSimpleGit.js";
import * as LOGGER from "./logging.js";

/**
 * Rewrites the message of the most recent Git commit on the current branch.
 *
 * Reads the last commit message, passes it through the provided formatter,
 * and amends the commit using `git commit --amend`.
 *
 * ⚠️ **Warning:** This rewrites Git history. If the commit has already been
 * pushed to a remote repository, this may require a force push and can
 * affect collaborators.
 *
 * @param ctx - Command execution context used for logging
 * @param formatter - Function that receives the old commit message and
 * returns the new commit message
 *
 * @returns A promise that resolves once the commit message has been amended
 */
export async function rewordLastCommitMessage(
    ctx: BaseCommand,
    formatter: (oldMessage: string) => string
) {
    const git = getSimpleGit();
    const branchName = (await git.branch()).current;

    LOGGER.debug(ctx, `Rewording last commit on ${branchName}`);

    const oldMessage = (
        await git.raw(["log", "-1", "--pretty=%B"])
    ).trim();

    await git.raw([
        "commit",
        "--amend",
        "--allow-empty",
        "-m",
        formatter(oldMessage),
    ]);

    LOGGER.debug(ctx, `✔ ${branchName} history rewritten`);
}
