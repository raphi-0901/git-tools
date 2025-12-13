import { simpleGit } from "simple-git";

import { BaseCommand } from "../base-commands/BaseCommand.js";
import * as LOGGER from "./logging.js";

export async function checkoutAllRemoteBranchesLocally(ctx: BaseCommand) {
    const git= simpleGit();

    LOGGER.log(ctx, "Fetching all remotes...");
    await git.fetch(["--all"]);

    LOGGER.log(ctx, "Listing remote branches...");
    const branchSummary = await git.branch(["-r"]);

    const remoteBranches = branchSummary.all.filter(
        (b) => !b.includes("HEAD") // skip HEAD pointer
    );

    LOGGER.log(ctx, `Found ${remoteBranches.length} remote branches.`);

    for (const remoteBranch of remoteBranches) {
        // remoteBranch looks like: "origin/feature/foo"
        const localBranch = remoteBranch.replace(/^origin\//, "");

        LOGGER.log(ctx, `Checking out ${remoteBranch} → local branch ${localBranch}`);

        // Check if local branch exists
        const localExists = (await git.branchLocal()).all.includes(localBranch);

        if (localExists) {
            // Just update it
            await git.checkout(localBranch);
            await git.pull("origin", localBranch);
        } else {
            // Create local branch tracking remote
            await git.checkout(["-b", localBranch, remoteBranch]);
        }
    }

    LOGGER.log(ctx, "All remote branches checked out locally.");
}
