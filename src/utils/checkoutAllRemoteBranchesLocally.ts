import { BaseCommand } from "../base-commands/BaseCommand.js";
import { getRemoteNames } from "./getRemoteNames.js";
import { getSimpleGit } from "./getSimpleGit.js";
import * as LOGGER from "./logging.js";
import { stripRemotePrefix } from "./stripRemotePrefix.js";

/**
 * Fetches all remotes and ensures that every remote branch has a corresponding
 * local branch.
 *
 * Behavior:
 * - Runs `git fetch --all` to update all remotes.
 * - Lists all remote branches and skips `HEAD` pointers.
 * - Normalizes branch names by removing remote prefixes.
 * - If a local branch already exists, it is checked out and pulled using the
 *   branch’s configured upstream.
 * - If it does not exist, a new local branch is created tracking the remote branch.
 *
 * @param {BaseCommand} ctx - The command context used for logging.
 *
 * @returns {Promise<void>} Resolves once all remote branches are checked out or updated locally.
 *
 * @example
 * await checkoutAllRemoteBranchesLocally(ctx);
 * // All remote branches are now available locally.
 *
 * @remarks
 * - Supports repositories with multiple remotes.
 * - Remote prefixes are stripped using `getRemoteNames` and `stripRemotePrefix`.
 * - Existing local branches are expected to have an upstream configured.
 * - This operation may take significant time in repositories with many branches.
 */
export async function checkoutAllRemoteBranchesLocally(ctx: BaseCommand): Promise<void> {
    const git = getSimpleGit();

    LOGGER.log(ctx, "Fetching all remotes...");
    await git.fetch(["--all"]);

    LOGGER.log(ctx, "Listing remote branches...");
    const branchSummary = await git.branch(["-r"]);

    const remoteBranches = branchSummary.all.filter(
        (branch) => !branch.includes("HEAD") // skip HEAD pointer
    );

    LOGGER.log(ctx, `Found ${remoteBranches.length} remote branches.`);

    const remoteNames = await getRemoteNames();

    for (const remoteBranch of remoteBranches) {
        // remoteBranch looks like: "origin/feature/foo"
        const localBranch = stripRemotePrefix(remoteBranch, remoteNames);

        LOGGER.log(ctx, `Checking out ${remoteBranch} → local branch ${localBranch}`);

        // Check if local branch exists
        const localExists = (await git.branchLocal()).all.includes(localBranch);

        if (localExists) {
            // Update existing local branch using its upstream
            await git.checkout(localBranch);
            await git.pull();
        } else {
            // Create local branch tracking remote
            await git.checkout(["-b", localBranch, remoteBranch]);
        }
    }

    LOGGER.log(ctx, "All remote branches checked out locally.");
}
