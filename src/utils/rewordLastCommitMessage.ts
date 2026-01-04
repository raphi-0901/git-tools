import { BaseCommand } from "../base-commands/BaseCommand.js";
import { getSimpleGit } from "./getSimpleGit.js";
import * as LOGGER from "./logging.js";

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
