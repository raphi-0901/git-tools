import { BaseCommand } from "../base-commands/BaseCommand.js";
import { getSimpleGit } from "./getSimpleGit.js";
import * as LOGGER from "./logging.js";

/**
 * Checks whether the current working directory is inside a Git repository.
 *
 * If it is not a Git repository, this function logs a fatal error and exits
 * using the provided command context.
 *
 * @param {BaseCommand} ctx - The command context used for logging and process termination.
 *
 * @returns {Promise<void>} Resolves if in a Git repository; does not return if not.
 *
 * @example
 * await checkIfInGitRepository(ctx);
 * // If not in a Git repo, the command will terminate with a fatal error.
 */
export async function checkIfInGitRepository(ctx: BaseCommand): Promise<void> {
    const git = getSimpleGit();

    const isRepository = await git.checkIsRepo();
    if (!isRepository) {
        LOGGER.fatal(ctx, "Not in a git repository");
    }
}
