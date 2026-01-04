import { Flags } from "@oclif/core";
import chalk from "chalk";
import dayjs, { Dayjs } from "dayjs";
import { writeFileSync } from "node:fs";

import { BaseCommand } from "../../base-commands/BaseCommand.js";
import { isProtectedBranch } from "../../utils/branchProtection.js";
import { checkIfInGitRepository } from "../../utils/checkIfInGitRepository.js";
import { classifyRemoteBranchesWithLimits } from "../../utils/classifyRemoteBranchesWithLimits.js";
import { deleteFirstNCommits } from "../../utils/deleteFirstNCommits.js";
import { getRemoteNames } from "../../utils/getRemoteNames.js";
import { getSimpleGit } from "../../utils/getSimpleGit.js";
import { getUpstreamBranch } from "../../utils/getUpstreamBranch.js";
import * as LOGGER from "../../utils/logging.js";
import { resetToCommitWhereAtLeastAgo } from "../../utils/resetToCommitWhereAtLeastAgo.js";
import { rewordLastCommitMessage } from "../../utils/rewordLastCommitMessage.js";
import { stripRemotePrefix } from "../../utils/stripRemotePrefix.js";

export default class DivergenceBranchesCommand extends BaseCommand<typeof DivergenceBranchesCommand> {
    static description = "Diverges every 5th branch";
    static flags = {
        'cleanBefore': Flags.boolean({
            aliases: ["clean-before"],
            description: 'Cleans up all local branches except main before starting and resets main to be synced with remote.',
            required: false,
        }),
    };
    public readonly commandId = "diverge-branches";
    public readonly configId = "diverge"

    async catch(error: unknown) {
        super.catch(error);
        this.log(chalk.red("🚫 Divergence failed."));
    }

    async createCommit(message: string, date?: Dayjs) {
        const git = getSimpleGit();

        // create README-i.md using fs
        writeFileSync(`README-${Math.random()}.md`, '');

        await git.add('.');
        if(date) {
            await git.env({
                GIT_AUTHOR_DATE: date.toISOString(),
                GIT_AUTHOR_EMAIL: "git-tools-evaluation@email.com",
                GIT_AUTHOR_NAME: "Git Tools Evaluation",

                GIT_COMMITTER_DATE: date.toISOString(),
                GIT_COMMITTER_EMAIL: "git-tools-evaluation@email.com",
                GIT_COMMITTER_NAME: "Git Tools Evaluation",
            }).commit(message);

            return;
        }

        await git.commit(message);
    }

    async run() {
        await checkIfInGitRepository(this);

        const git = getSimpleGit();

        // Get all remote branches
        const remoteBranches = (await git.branch(["-r"])).all;
        const remoteNames = await getRemoteNames();

        if (remoteNames.length === 0) {
            LOGGER.fatal(this, "No remotes found. Please add a remote first.");
        }

        const allNonProtectedRemoteBranches = remoteBranches.filter((branch) => {
            const normalizedBranch = stripRemotePrefix(branch, remoteNames)

            return !isProtectedBranch(normalizedBranch)
        })

        const branchConsideredMain = (await git.branch()).current;

        if (this.flags.cleanBefore) {
            // remove all other local branches than main
            const localBranches = (await git.branchLocal()).all;
            for (const localBranch of localBranches) {
                if (localBranch !== branchConsideredMain) {
                    await git.branch(["-D", localBranch]);
                }
            }

            const upstreamOfMain = await getUpstreamBranch(branchConsideredMain)
            if(upstreamOfMain) {
                await git.reset(['--hard', upstreamOfMain])
            }

            LOGGER.log(this, "Cleaned up repository.")
        }

        const classifiedRemoteBranches = await classifyRemoteBranchesWithLimits(this, {
            mergeTarget: branchConsideredMain,
            remoteBranches: allNonProtectedRemoteBranches
        })

        // this.spinner.text = "Creating local branches which get merged into main..."
        for (let i = 0; i < 10; i++) {
            const localBranchName = `feature/${i}-git-tools-evaluation`;

            await git.checkout(["-b", localBranchName, branchConsideredMain]);
            await this.createCommit(`feat: add README-${i}.md`);
            await git.checkout(branchConsideredMain);

            await git.merge(["--no-edit", localBranchName]);

            this.logBranchCreated(localBranchName)
        }

        // this.spinner.text = "Checking out local abandoned branches...";
        for (const branch of classifiedRemoteBranches.abandoned) {
            const localBranchName = stripRemotePrefix(branch, remoteNames) + "-aban"

            await git.checkout(["-b", localBranchName, branch]);
            await git.branch(["--unset-upstream"]);
            await resetToCommitWhereAtLeastAgo(this, dayjs().subtract(1, "year"))
            // add one commit to make sure it is not flagged as merged
            await this.createCommit("WIP", dayjs().subtract(1, "year"))
            this.logBranchCreated(localBranchName)
        }

        // this.spinner.text = "Checking out local experiment branches...";
        for (const branch of classifiedRemoteBranches.experiments) {
            const localBranchName = stripRemotePrefix(branch, remoteNames) + "-expi"
            await git.checkout(["-b", localBranchName, branch]);

            await deleteFirstNCommits(this, Math.floor(Math.random() * 150))
            await rewordLastCommitMessage(this, (oldMessage) => oldMessage + " (diverged from remote branch " + branch + ")")
            this.logBranchCreated(localBranchName)
        }

        // this.spinner.text = "Checking out local synchronized branches which are needed...";
        for (const branch of classifiedRemoteBranches.synchronizedNeeded) {
            const localBranchName = stripRemotePrefix(branch, remoteNames) + "-synn"
            await git.checkout(["-b", localBranchName, branch]);
            this.logBranchCreated(localBranchName)
        }

        // this.spinner.text = "Checking out local synchronized branches which are not needed...";
        for (const branch of classifiedRemoteBranches.synchronizedOld) {
            const localBranchName = stripRemotePrefix(branch, remoteNames) + "-syno"
            await git.checkout(["-b", localBranchName, branch]);
            this.logBranchCreated(localBranchName)
        }

        // this.spinner.text = "Creating behindOnly branches...";
        for (const branch of classifiedRemoteBranches.behindOnly) {
            const localBranchName = stripRemotePrefix(branch, remoteNames) + "-beho"
            await git.checkout(["-b", localBranchName, branch]);
            await deleteFirstNCommits(this, Math.floor(Math.random() * 150))
            this.logBranchCreated(localBranchName)
        }

        // this.spinner.text = "Creating aheadOnly branches...";
        for (const branch of classifiedRemoteBranches.pendingPush) {
            const localBranchName = stripRemotePrefix(branch, remoteNames) + "-ahea"
            await git.checkout(["-b", localBranchName, branch]);
            await this.createCommit('WIP', dayjs().subtract(1, 'day'))
            this.logBranchCreated(localBranchName)
        }

        await git.checkout(branchConsideredMain);
    }

    private logBranchCreated(branchName: string) {
        LOGGER.log(this, `Created branch: ${branchName}`)
    }
}
