import { Command } from "@oclif/core";
import { simpleGit } from "simple-git";

import * as LOGGER from "./logging.js";

export async function checkIfInGitRepository(ctx: Command) {
    const git = simpleGit();

    const isRepository = await git.checkIsRepo();
    if(!isRepository) {
        LOGGER.fatal(ctx, "Not in a git repository");
    }
}
