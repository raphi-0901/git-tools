import { Flags } from "@oclif/core";
import chalk from "chalk";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";

import { BaseCommand } from "../../base-commands/BaseCommand.js";
import { ListItem, renderCheckboxList } from "../../ui/CheckboxList.js";
import { analyzeBranches } from "../../utils/branchAnalyzer.js";
import { isProtectedBranch } from "../../utils/branchProtection.js";
import { calculateBranchImportance } from "../../utils/calculateBranchImportance.js";
import { getLastCommitDate } from "../../utils/getLastCommitDate.js";
import { getRemoteStatus } from "../../utils/getRemoteStatus.js";
import { getSimpleGit } from "../../utils/getSimpleGit.js";
import { getUpstreamBranch } from "../../utils/getUpstreamBranch.js";
import { isBranchMergedInto } from "../../utils/isBranchMergedInto.js";
import * as LOGGER from "../../utils/logging.js";
import { withPromptExit } from "../../utils/withPromptExist.js";

dayjs.extend(relativeTime);

export default class BranchCleanupCommand extends BaseCommand {
    public readonly configId = "branch-cleanup";
    private branchImportanceScore = new Map<string, number>();
    private branchToLastCommitDateCache = new Map<string, number>();

    async buildLastCommitCache(branches: string[]) {
        await Promise.all(
            branches.map(async (branch) => {
                try {
                    const lastCommitDate = await getLastCommitDate(branch)
                    this.branchToLastCommitDateCache.set(branch, lastCommitDate);

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
        const git = getSimpleGit();
        const branchStats = new Map<string, { commitCount: number; lastCommitDate: number }>();

        await Promise.all(
            allBranches.map(async (branch) => {
                try {
                    const commitCount = Number.parseInt(await git.raw(["rev-list", "--count", branch]), 10);
                    const dateRaw = await git.raw(["log", branch, "-n", "1", "--pretty=format:%ci"]);
                    const lastCommitDate = new Date(dateRaw.trim()).getTime();

                    branchStats.set(branch, { commitCount, lastCommitDate });
                    this.branchToLastCommitDateCache.set(branch, lastCommitDate);
                } catch (error) {
                    LOGGER.debug(this, `Error getting stats for ${branch}: ${error}`);
                }
            })
        );

        const branchScores = allBranches.map((branch) => {
            const stats = branchStats.get(branch);
            if (!stats) return { branch, score: 0 };
            let score = 0;
            const normalizedBranch = branch.replace(/^origin\//, '');

            if (isProtectedBranch(normalizedBranch)) score += 10_000;
            score += Math.log(stats.commitCount + 1) * 100;
            const daysSinceCommit = (Date.now() - stats.lastCommitDate) / (1000 * 60 * 60 * 24);
            score += Math.max(0, 500 - daysSinceCommit);

            if (/^(main|master|production|prod)$/i.test(normalizedBranch)) score += 5000;
            else if (/^(development|develop|dev)$/i.test(normalizedBranch)) score += 4000;
            else if (/^(staging|stage)$/i.test(normalizedBranch)) score += 3000;
            else if (/^(release|hotfix)\//i.test(normalizedBranch)) score += 2000;
            else if (/^(feature|feat)\//i.test(normalizedBranch)) score -= 500;

            return { branch, score };
        });

        const sortedBranches = branchScores.sort((a, b) => b.score - a.score).map((b) => b.branch);
        const threshold = 1000;
        const topBranches = sortedBranches.filter((branch) => (branchScores.find((b) => b.branch === branch)?.score ?? 0) > threshold);

        return topBranches.slice(0, Math.max(5, Math.min(15, topBranches.length)));
    }

    logTotalTime() {
        LOGGER.debug(this, `Action took ${this.timer.stop("total")}.`);
    }

    async run() {
        await this.parse(BranchCleanupCommand);
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
        const candidateBranches = localBranches.filter(b => !isProtectedBranch(b));

        // Build cache for last commit dates and importance
        this.spinner.text = "Analyzing branch activity...";
        await this.buildLastCommitCache(allBranches);

        // Identify potential target branches
        const potentialTargets = await this.identifyPotentialTargetBranches(allBranches);

        this.spinner.text = "Detecting branch states...";
        const analysis = await analyzeBranches(
            candidateBranches,
            potentialTargets,
            this.branchToLastCommitDateCache,
            this.branchImportanceScore
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

        // TODO prompting each by each
        // // 7️⃣ Build UI items for selection
        // const items = buildBranchListItems(analysis);
        //
        // // 8️⃣ Prompt user for branches to delete
        // const branchesToDelete = await withPromptExit(this, () =>
        //     renderCheckboxList({ items, message: "Select branches to delete:" })
        // );
        //
        // // 9️⃣ Delete selected branches
        // if (branchesToDelete.length > 0) {
        //     this.spinner.start();
        //     for (const branch of branchesToDelete) {
        //         const isDiverged = analysis.diverged.has(branch) || analysis.localOnly.has(branch);
        //         try {
        //             // Uncomment to actually delete
        //             // await git.branch([isDiverged ? "-D" : "-d", branch]);
        //             LOGGER.log(this, `${chalk.red("✗")} Deleted: ${branch}`);
        //         } catch (error) {
        //             LOGGER.error(this, `Error deleting branch ${branch}: ${error}`);
        //         }
        //     }
        //
        //     this.spinner.stop();
        //     LOGGER.log(this, `${chalk.green("✓")} Successfully deleted ${branchesToDelete.length} branches!`);
        // }

        // 10️⃣ Finish timing
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
