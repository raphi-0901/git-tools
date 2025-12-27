import { Flags } from "@oclif/core";
import chalk from "chalk";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";

import { BaseCommand } from "../../base-commands/BaseCommand.js";
import { analyzeBranches } from "../../utils/branchAnalyzer.js";
import { isProtectedBranch } from "../../utils/branchProtection.js";
import { promptBranchesToDelete } from "../../utils/branchSelection.js";
import { calculateBranchImportance } from "../../utils/calculateBranchImportance.js";
import { getCommitCount } from "../../utils/getCommitCount.js";
import { getLastCommitDate } from "../../utils/getLastCommitDate.js";
import { getSimpleGit } from "../../utils/getSimpleGit.js";
import * as LOGGER from "../../utils/logging.js";

dayjs.extend(relativeTime);

export default class BranchCleanupCommand extends BaseCommand {
    static flags = {
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
    private branchImportanceScore = new Map<string, number>();
    private branchToCommitCountCache = new Map<string, number>();
    private branchToLastCommitDateCache = new Map<string, number>();

    async buildCache(branches: string[]) {
        await Promise.all(
            branches.map(async (branch) => {
                try {
                    const [lastCommitDate, commitCount] = await Promise.all([
                        getLastCommitDate(branch),
                        getCommitCount(branch),
                    ])
                    this.branchToLastCommitDateCache.set(branch, lastCommitDate);
                    this.branchToCommitCountCache.set(branch, commitCount);

                    const importance = calculateBranchImportance(branch, lastCommitDate);
                    this.branchImportanceScore.set(branch, importance);
                } catch (error) {
                    LOGGER.debug(this, `Error getting commit date for ${branch}: ${error}`);
                }
            })
        );
    }

    async catch(error: unknown) {
        super.catch(error);
        this.log(chalk.red("🚫 Branch cleanup cancelled."));
    }

    async identifyPotentialTargetBranches(
        allBranches: string[]
    ): Promise<string[]> {
        const branchStats = new Map<string, { commitCount: number; lastCommitDate: number }>();
        for (const branch of allBranches) {
            const commitCount = this.branchToCommitCountCache.get(branch) ?? 0;
            const lastCommitDate = this.branchToLastCommitDateCache.get(branch) ?? 0;

            branchStats.set(branch, { commitCount, lastCommitDate });
        }

        const branchScores = allBranches.map((branch) => {
            const stats = branchStats.get(branch);
            if (!stats) {
                return { branch, score: 0 };
            }

            let score = 0;
            const normalizedBranch = branch.replace(/^origin\//, '');

            if (isProtectedBranch(normalizedBranch)) {
                score += 10_000;
            }

            score += Math.log(stats.commitCount + 1) * 100;
            const daysSinceCommit = dayjs(stats.lastCommitDate).diff(dayjs(), "days", true);
            score += Math.max(0, 500 - daysSinceCommit);

            if (/^(main|master|production|prod)$/i.test(normalizedBranch)) {
                score += 5000;
            } else if (/^(development|develop|dev)$/i.test(normalizedBranch)) {
                score += 4000;
            } else if (/^(staging|stage)$/i.test(normalizedBranch)) {
                score += 3000;
            } else if (/^(release|hotfix)\//i.test(normalizedBranch)) {
                score += 2000;
            } else if (/^(feature|feat)\//i.test(normalizedBranch)) {
                score -= 500;
            }

            return { branch, score };
        });

        return branchScores
            .sort((a, b) => b.score - a.score)
            .filter(({ score }, index) => {
                if (index > 15) {
                    return false
                }

                return score > 1000
            }).map(({ branch }) => branch);
    }

    logTotalTime() {
        LOGGER.debug(this, `Action took ${this.timer.stop("total")}.`);
    }

    async run() {
        const { flags } = await this.parse(BranchCleanupCommand);
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
        const localBranches = (await git.branchLocal()).all;
        const remoteBranches = (await git.branch(["-r"])).all;
        const allBranches = [...localBranches, ...remoteBranches];

        // all locale branches which are not protected
        const candidateBranches = localBranches.filter(b => !isProtectedBranch(b));

        // Build cache for last commit dates and importance
        this.spinner.text = "Analyzing branch activity...";
        await this.buildCache(allBranches);

        // Identify potential target branches
        const potentialTargets = await this.identifyPotentialTargetBranches(allBranches);

        this.spinner.text = "Detecting branch states...";
        const analysis = await analyzeBranches({
                branches: candidateBranches,
                lastCommitCache: this.branchToLastCommitDateCache,
                potentialTargets,
                staleDays: flags.staleDays,
            }
        );

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
                    // await git.deleteLocalBranches(branchesToDelete, true)
                    LOGGER.log(this, `${chalk.red("✗")} Deleted: ${branch}`);
                } catch (error) {
                    LOGGER.error(this, `Error deleting branch ${branch}: ${error}`);
                }
            }

            this.spinner.stop();
            LOGGER.log(this, `${chalk.green("✓")} Successfully deleted ${branchesToDelete.length} of ${localBranches.length} branches!`);
        }

        this.logTotalTime();
    }


    // async run2() {
    //     const items: ListItem<string>[] = [];
    //     if (mergedBranches.size > 0) {
    //         items.push({ label: `Merged Branches (${mergedBranches.size})`, type: "separator" });
    //         const sorted = [...mergedBranches.entries()].sort((a, b) => (this.branchImportanceScore.get(b[1].mostRelevantBranch) ?? 0) - (this.branchImportanceScore.get(a[1].mostRelevantBranch) ?? 0));
    //         items.push(...sorted.map(([branch, info]) => ({
    //             key: branch, label: `${chalk.yellow(branch)} ${chalk.dim("→")} ${chalk.green(info.mostRelevantBranch)} ${chalk.dim(`(${dayjs(info.lastCommitDate).fromNow()})`)}`, type: "item" as const, value: branch
    //         })));
    //     }
    //
    //     if (behindOnlyBranches.size > 0) {
    //         items.push({ label: `Only pending pulls (Behind)`, type: "separator" });
    //         items.push(...[...behindOnlyBranches.entries()].map(([branch, info]) => ({
    //             key: branch, label: `${chalk.blue(branch)} ${chalk.dim(`(↓${info.behindCount}, active: ${dayjs(info.lastCommitDate).fromNow()})`)}`, type: "item" as const, value: branch
    //         })));
    //     }
    //
    //     if (divergedBranches.size > 0) {
    //         items.push({ label: `Outdated & Diverged Branches (WARNING: Local changes!)`, type: "separator" });
    //         items.push(...[...divergedBranches.entries()].map(([branch, info]) => {
    //             const aheadColor = info.ahead > 10 ? chalk.red : chalk.yellow;
    //             const behindColor = info.behind > 50 ? chalk.red : chalk.blue;
    //             return {
    //                 key: branch,
    //                 label: `${chalk.red.bold(branch)} ${chalk.dim("(")}${aheadColor(`↑${info.ahead}`)} ${behindColor(`↓${info.behind}`)}${chalk.dim(`, active: ${dayjs(info.lastCommitDate).fromNow()})`)}`,
    //                 type: "item" as const,
    //                 value: branch
    //             };
    //         }));
    //     }
    //
    //     if (localOnlyBranches.size > 0) {
    //         items.push({ label: `Local branches without remote`, type: "separator" }, ...[...localOnlyBranches.entries()].map(([branch, lastCommitDate]) => ({
    //             key: branch, label: `${chalk.magenta(branch)} ${chalk.dim(`(Local only, active: ${dayjs(lastCommitDate).fromNow()})`)}`, type: "item" as const, value: branch
    //         })));
    //     }
    //
    //     if (staleBranches.size > 0) {
    //         items.push({ label: `Stale branches (>30 days, synced)`, type: "separator" }, ...[...staleBranches.entries()].map(([branch, lastCommitDate]) => ({
    //             key: branch, label: `${chalk.gray(branch)} ${chalk.dim(`(Synced, active: ${dayjs(lastCommitDate).fromNow()})`)}`, type: "item" as const, value: branch
    //         })));
    //     }
    //
    //     const branchesToDelete = await withPromptExit(this, () => renderCheckboxList({ items, message: "Select branches to delete:" }));
    //
    //     if (branchesToDelete.length > 0) {
    //         this.spinner.start();
    //         for (const branch of branchesToDelete) {
    //             // For diverged branches we use -D instead of -d to force delete despite missing merge
    //             const isDiverged = divergedBranches.has(branch) || localOnlyBranches.has(branch);
    //             try {
    //                 // await git.branch([isDiverged ? "-D" : "-d", branch]);
    //                 LOGGER.log(this, `${chalk.red("✗")} Deleted: ${branch}`);
    //             }
    //             catch (error) {
    //                 LOGGER.error(this, `Error deleting branch ${branch}: ${error}`);
    //             }
    //         }
    //
    //         this.spinner.stop();
    //         LOGGER.log(this, `${chalk.green("✓")} Successfully deleted ${branchesToDelete.length} branches!`);
    //     }
    //
    //     this.logTotalTime();
    // }
}
