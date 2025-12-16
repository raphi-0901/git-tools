import { BaseCommand } from "../base-commands/BaseCommand.js";
import { getSimpleGit } from "./getSimpleGit.js";
import * as LOGGER from "./logging.js";

export async function checkIfInGitRepository(ctx: BaseCommand) {
    const git = getSimpleGit();

    const isRepository = await git.checkIsRepo();
    if(!isRepository) {
        LOGGER.fatal(ctx, "Not in a git repository");
    }
}
