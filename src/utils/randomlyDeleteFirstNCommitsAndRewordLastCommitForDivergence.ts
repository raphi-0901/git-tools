import { BaseCommand } from "../base-commands/BaseCommand.js";
import { getSimpleGit } from "./getSimpleGit.js";
import * as LOGGER from "./logging.js";

export async function randomlyDeleteFirstNCommitsAndRewordLastCommitForDivergence(
    ctx: BaseCommand,
    branchName: string
) {
    const git = getSimpleGit();

    // 🔒 Check if branch exists locally
    const localBranches = await git.branchLocal();
    if (!localBranches.all.includes(branchName)) {
        throw new Error(`Branch '${branchName}' does not exist locally`);
    }

    LOGGER.log(ctx, `Checking out branch ${branchName}`);
    await git.checkout(branchName);

    // Count commits on the branch
    const commitCount = Number.parseInt(
        (await git.raw(["rev-list", "--count", "HEAD"])).trim(),
        10
    );

    if (commitCount < 3) {
        LOGGER.log(ctx, `Skipping ${branchName}: not enough commits`);
        return;
    }

    // Randomly choose N (keep at least 2 commits)
    const maxDeletable = commitCount - 2;
    const N = Math.floor(Math.random() * maxDeletable) + 1;

    LOGGER.log(
        ctx,
        `Deleting first ${N} commits out of ${commitCount} on ${branchName}`
    );

    // Determine new root commit (skip first N commits)
    const commits = (
        await git.raw(["rev-list", "--reverse", "HEAD"])
    )
        .trim()
        .split("\n");

    const newRoot = commits[N];
    await git.reset(["--hard", newRoot]);

    LOGGER.log(ctx, `Rewording last commit on ${branchName}`);

    const oldMessage = (
        await git.raw(["log", "-1", "--pretty=%B"])
    ).trim();

    await git.raw([
        "commit",
        "--amend",
        "--allow-empty",
        "-m",
        oldMessage + " (rw)",
    ]);

    LOGGER.log(ctx, `✔ ${branchName} history rewritten and diverged`);
}
