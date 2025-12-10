import { simpleGit } from "simple-git";

import { BaseCommand } from "../base-commands/BaseCommand.js";
import * as LOGGER from "./logging.js";

export async function checkIfInGitRepository(ctx: BaseCommand) {
    const git = simpleGit();

    const isRepository = await git.checkIsRepo();
    if(!isRepository) {
        LOGGER.fatal(ctx, "Not in a git repository");
    }
}
