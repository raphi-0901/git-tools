import {Command} from "@oclif/core";
import {simpleGit} from "simple-git";

export async function checkIfInGitRepository(ctx: Command) {
    const git = simpleGit();

    const isRepository = await git.checkIsRepo();
    if(!isRepository) {
        ctx.error("Not in a git repository");
    }
}
