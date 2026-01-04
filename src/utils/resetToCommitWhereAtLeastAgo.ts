import dayjs, { Dayjs } from "dayjs";

import { BaseCommand } from "../base-commands/BaseCommand.js";
import { getSimpleGit } from "./getSimpleGit.js";
import * as LOGGER from "./logging.js";

export async function resetToCommitWhereAtLeastAgo(
    ctx: BaseCommand,
    commitBefore: Dayjs,
) {
    const git = getSimpleGit();
    const branchName = (await git.branch()).current;
    const log = await git.log();

    for (const commit of log.all) {
        const commitDate = dayjs(commit.date);

        if(commitDate.isBefore(commitBefore)) {
            await git.reset(["--hard", commit.hash]);
            LOGGER.debug(ctx, `Resetting ${branchName} to commit where at least ${commitBefore.fromNow()} ago`);
            return;
        }
    }

    LOGGER.warn(ctx, `No commits found where at least ${commitBefore.fromNow()} ago`);
}
