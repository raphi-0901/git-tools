import dayjs, { Dayjs } from "dayjs";

import { BaseCommand } from "../base-commands/BaseCommand.js";
import { getSimpleGit } from "./getSimpleGit.js";
import * as LOGGER from "./logging.js";

/**
 * Resets the current Git branch to the most recent commit
 * whose commit date is **before** the given timestamp.
 *
 * Iterates through the commit history (newest → oldest) and performs
 * a hard reset (`git reset --hard <hash>`) on the first commit found
 * that is at least as old as `commitBefore`.
 *
 * ⚠️ **Warning:** This operation is destructive and will discard all
 * uncommitted changes and commits after the target commit.
 *
 * @param ctx - Command execution context used for logging
 * @param commitBefore - Point in time; the branch will be reset to the
 * first commit older than this timestamp
 *
 * @returns A promise that resolves once the reset is completed,
 * or after logging a warning if no suitable commit was found.
 */
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
