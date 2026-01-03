import { Flags } from "@oclif/core";
import chalk from "chalk";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";

import { BaseCommand } from "../../base-commands/BaseCommand.js";
import { analyzeBranches } from "../../utils/branchAnalyzer.js";
import { isProtectedBranch, protectedBranchPatterns } from "../../utils/branchProtection.js";
import { promptBranchesToDelete } from "../../utils/branchSelection.js";
import { getBranchesSummary } from "../../utils/branchSummary.js";
import { identifyPotentialTargetBranches } from "../../utils/branchTargetIdentification.js";
import { getCommitCount } from "../../utils/getCommitCount.js";
import { getLastCommitDate } from "../../utils/getLastCommitDate.js";
import { getRemoteStatus, RemoteStatus } from "../../utils/getRemoteStatus.js";
import { getSimpleGit } from "../../utils/getSimpleGit.js";
import * as LOGGER from "../../utils/logging.js";

dayjs.extend(relativeTime);

export default class BranchCleanupCommand extends BaseCommand<typeof BranchCleanupCommand> {
    static flags = {
        'dryRun': Flags.boolean({
            aliases: ["dry-run"],
            description: 'Run without actually deleting branches',
            required: false,
        }),
        'protectedBranches': Flags.string({
            char: 'p',
            description: 'Regex for protected branches. Will not be deleted even if they are stale.',
            multiple: true,
            multipleNonGreedy: false,
            required: false,
        }),
        'staleDays': Flags.integer({
            aliases: ['stale-days'],
            char: 'd',
            default: 30,
            description: 'Number of days since last commit after which a branch is considered stale',
            min: 1,
            required: false,
        }),
    };
    public readonly configId = "branch-cleanup";
    private branchToCommitCountCache = new Map<string, number>();
    private branchToLastCommitDateCache = new Map<string, number>();
    private localBranchToRemoteStatuses = new Map<string, RemoteStatus[]>();

    async buildCache(localBranches: string[], remoteBranches: string[]) {
        const allBranches = [...localBranches, ...remoteBranches];

        const allBranchPromises = allBranches.map(async (branch) => {
            try {
                const [lastCommitDate, commitCount] = await Promise.all([
                    getLastCommitDate(branch),
                    getCommitCount(branch),
                ])
                this.branchToLastCommitDateCache.set(branch, lastCommitDate);
                this.branchToCommitCountCache.set(branch, commitCount);
            } catch (error) {
                LOGGER.debug(this, `Error getting infos for ${branch}: ${error}`);
            }
        })

        const localBranchPromises = localBranches.map(async (branch) => {
            try {
                const remoteStatus = await getRemoteStatus(branch);
                this.localBranchToRemoteStatuses.set(branch, remoteStatus);
            } catch (error) {
                LOGGER.debug(this, `Error getting infos for ${branch}: ${error}`);
            }
        })

        await Promise.all([
            ...localBranchPromises,
            ...allBranchPromises,
        ]);
    }

    async catch(error: unknown) {
        super.catch(error);
        this.log(chalk.red("🚫 Branch cleanup cancelled."));
    }

    logTotalTime() {
        LOGGER.debug(this, `Action took ${this.timer.stop("total")}.`);
    }

    async run() {
        const finalProtectedBranchPatterns = this.flags.protectedBranches
            ? this.flags.protectedBranches.map(pattern => new RegExp(pattern))
            : protectedBranchPatterns;

        this.timer.start("total");
        this.spinner.start();

        const git = getSimpleGit();

        // Fetch all remotes
        this.spinner.text = "Fetching repository...";
        try {
            await git.fetch(["--all"]);
        } catch {
            LOGGER.warn(this, "Error fetching repository.");
        }

        // Load local and remote branches
        this.spinner.text = "Loading branches...";
        const { allBranches, localBranches, remoteBranches } = await getBranchesSummary()

        // all locale branches which are not protected
        const candidateBranches = localBranches.filter(branch => !isProtectedBranch(branch, finalProtectedBranchPatterns));

        // Build cache for last commit dates and importance
        this.spinner.text = "Analyzing branch activity...";
        this.timer.start("building-cache");
        await this.buildCache(localBranches, remoteBranches);
        LOGGER.debug(this, `Building cache took ${this.timer.stop("building-cache")}`)

        // Identify potential target branches
        const potentialTargets = await identifyPotentialTargetBranches({
            allBranches,
            branchToCommitCountCache: this.branchToCommitCountCache,
            branchToLastCommitDateCache: this.branchToLastCommitDateCache,
            protectedBranchPatterns: finalProtectedBranchPatterns,
        });

        LOGGER.debug(this, `Potential target branches: ${potentialTargets.join(", ")}`)

        this.spinner.text = "Detecting branch states...";
        this.timer.start("branch-analysis");
        const analysis = await analyzeBranches({
                branches: candidateBranches,
                branchToLastCommitDateCache: this.branchToLastCommitDateCache,
                localBranchToRemoteStatuses: this.localBranchToRemoteStatuses,
                potentialTargets,
                staleDays: this.flags.staleDays,
            }
        );
        LOGGER.debug(this, `Branch analysis took ${this.timer.stop("branch-analysis")}`)
        this.spinner.stop();

        // Check if there are any branches to act on
        if (
            analysis.merged.size === 0 &&
            analysis.stale.size === 0 &&
            analysis.behindOnly.size === 0 &&
            analysis.localOnly.size === 0 &&
            analysis.diverged.size === 0
        ) {
            LOGGER.log(this, "✅ No cleanup candidates found.");
            this.logTotalTime();

            return;
        }

        const branchesToDelete = await promptBranchesToDelete(this, analysis, this.flags.yes)
        if (branchesToDelete.length > 0) {
            this.spinner.start();
            for (const branch of branchesToDelete) {
                try {
                    // Uncomment to actually delete
                    if(this.flags.dryRun) {
                        LOGGER.log(this, `${chalk.red("✗")} Would delete branch ${branch} (dry run).`)
                    } else {
                        await git.deleteLocalBranches(branchesToDelete, true)
                        LOGGER.log(this, `${chalk.red("✗")} Deleted: ${branch}`);
                    }

                } catch (error) {
                    LOGGER.error(this, `Error deleting branch ${branch}: ${error}`);
                }
            }

            this.spinner.stop();

            if(this.flags.dryRun) {
                LOGGER.log(this, `${chalk.green("✓")} Would have deleted ${branchesToDelete.length} of ${localBranches.length} branches (dry run).`)
            } else {
                LOGGER.log(this, `${chalk.green("✓")} Successfully deleted ${branchesToDelete.length} of ${localBranches.length} branches!`);
            }
        }

        this.logTotalTime();
    }
}
