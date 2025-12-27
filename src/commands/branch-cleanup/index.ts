import { Flags } from "@oclif/core";
import chalk from "chalk";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";

import { BaseCommand } from "../../base-commands/BaseCommand.js";
import { ListItem, renderCheckboxList } from "../../ui/CheckboxList.js";
import { getSimpleGit } from "../../utils/getSimpleGit.js";
import * as LOGGER from "../../utils/logging.js";
import { withPromptExit } from "../../utils/withPromptExist.js";

dayjs.extend(relativeTime);

type MergeInfo = {
    lastCommitDate: number;
    mergedIntoBranches: string[];
    mostRelevantBranch: string;
};

export default class BranchCleanupCommand extends BaseCommand {
    static flags = {
        debug: Flags.boolean({ description: "Show debug logs." }),
        yes: Flags.boolean({ char: "y", description: "Automatically delete all candidate branches without prompt." }),
    };
public readonly configId = "branch-cleanup";
    private branchImportanceScore = new Map<string, number>();
    private branchToLastCommitDateCache = new Map<string, number>();
    private readonly protectedBranchPatterns = [
        /^main$/,
        /^master$/,
        /^development$/,
        /^develop$/,
        /^release\//,
        /^hotfix\//,
    ];

    async buildLastCommitCache(branches: string[]) {
        const git = getSimpleGit();

        await Promise.all(
            branches.map(async (branch) => {
                try {
                    const raw = await git.raw(["log", branch, "-n", "1", "--pretty=format:%ci"]);
                    const date = new Date(raw.trim()).getTime();
                    this.branchToLastCommitDateCache.set(branch, date);

                    const importance = this.calculateBranchImportance(branch, date);
                    this.branchImportanceScore.set(branch, importance);
                } catch (error) {
                    LOGGER.debug(this, `Error getting commit date for ${branch}: ${error}`);
                }
            })
        );
    }

    calculateBranchImportance(branchName: string, lastCommitDate: number): number {
        let score = 0;
        const normalizedName = branchName.replace(/^origin\//, '');

        if (/^(main|master)$/.test(normalizedName)) score += 1000;
        else if (/^(development|develop)$/.test(normalizedName)) score += 900;
        else if (/^release\//.test(normalizedName)) score += 800;
        else if (/^hotfix\//.test(normalizedName)) score += 700;
        else if (normalizedName.startsWith('staging')) score += 600;
        else if (normalizedName.startsWith('production')) score += 950;

        const daysSinceCommit = (Date.now() - lastCommitDate) / (1000 * 60 * 60 * 24);
        const activityScore = Math.max(0, 100 - daysSinceCommit);

        return score + activityScore;
    }

    async catch(error: unknown) {
        super.catch(error);
        this.log(chalk.red("🚫 Branch cleanup cancelled."));
    }

    async findMergeTargets(sourceBranch: string, potentialTargets: string[]): Promise<string[]> {
        const mergedInto: string[] = [];

        for (const target of potentialTargets) {
            if (target === sourceBranch) continue;

            const isMerged = await this.isBranchMergedInto(sourceBranch, target);
            if (isMerged) {
                mergedInto.push(target);
            }
        }

        return mergedInto;
    }

    async identifyPotentialTargetBranches(allBranches: string[], remoteBranches: string[]): Promise<string[]> {
        const git = getSimpleGit();
        const allAvailableBranches = [...allBranches, ...remoteBranches];
        const branchStats = new Map<string, { commitCount: number; lastCommitDate: number }>();

        await Promise.all(
            allAvailableBranches.map(async (branch) => {
                try {
                    const commitCountRaw = await git.raw(["rev-list", "--count", branch]);
                    const commitCount = Number.parseInt(commitCountRaw.trim(), 10);
                    const dateRaw = await git.raw(["log", branch, "-n", "1", "--pretty=format:%ci"]);
                    const lastCommitDate = new Date(dateRaw.trim()).getTime();

                    branchStats.set(branch, { commitCount, lastCommitDate });
                    this.branchToLastCommitDateCache.set(branch, lastCommitDate);
                } catch (error) {
                    LOGGER.debug(this, `Error getting stats for ${branch}: ${error}`);
                }
            })
        );

        const branchScores = allAvailableBranches.map((branch) => {
            const stats = branchStats.get(branch);
            if (!stats) return { branch, score: 0 };
            let score = 0;
            const normalizedBranch = branch.replace(/^origin\//, '');

            if (this.isProtectedBranch(normalizedBranch)) score += 10_000;
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

    async isBranchMergedInto(sourceBranch: string, targetBranch: string): Promise<boolean> {
        const git = getSimpleGit();
        try {
            const result = await git.raw(["log", `${targetBranch}..${sourceBranch}`, "--oneline"]);
            return result.trim() === "";
        } catch {
            return false;
        }
    }

    isProtectedBranch(branch: string): boolean {
        return this.protectedBranchPatterns.some((r) => r.test(branch));
    }

    logTotalTime() {
        LOGGER.debug(this, `Action took ${this.timer.stop("total")}.`);
    }

    async getBranchCandidatesPerType() {
        this.spinner.text = "Loading branches...";
        const git = getSimpleGit();

        const allBranches = (await git.branchLocal()).all;
        const remoteBranchesRaw = (await git.branch(['-r'])).all;
        const remoteBranches = remoteBranchesRaw.filter(b => !b.includes('HEAD ->')).map(b => b.trim());

        const candidateBranches = allBranches.filter((b) => !this.isProtectedBranch(b));
        this.spinner.text = "Analyzing branch activity...";
        await this.buildLastCommitCache(allBranches);

        const potentialTargets = await this.identifyPotentialTargetBranches(allBranches, remoteBranches);

        this.spinner.text = "Detecting branch states...";
        const mergedBranches = new Map<string, MergeInfo>();
        const staleBranches = new Map<string, number>();
        const behindOnlyBranches = new Map<string, { behindCount: number; lastCommitDate: number; }>();
        const localOnlyBranches = new Map<string, number>();
        const divergedBranches = new Map<string, { ahead: number; behind: number; lastCommitDate: number; }>();

        await Promise.all(
            candidateBranches.map(async (branch) => {
                const mergedInto = await this.findMergeTargets(branch, potentialTargets);
                const lastCommitDate = this.branchToLastCommitDateCache.get(branch) ?? 0;

                if (mergedInto.length > 0) {
                    const mostRelevant = this.selectMostRelevantBranch(mergedInto);
                    mergedBranches.set(branch, { lastCommitDate, mergedIntoBranches: mergedInto, mostRelevantBranch: mostRelevant });
                } else {
                    const { ahead, behind, hasRemote } = await this.getRemoteStatus(branch);
                    const daysSinceCommit = (Date.now() - lastCommitDate) / (1000 * 60 * 60 * 24);

                    if (!hasRemote) {
                        localOnlyBranches.set(branch, lastCommitDate);
                    } else if (ahead > 0 && behind > 0) {
                        if (daysSinceCommit > 30) {
                            divergedBranches.set(branch, { ahead, behind, lastCommitDate });
                        }
                    } else if (behind > 0 && ahead === 0) {
                        behindOnlyBranches.set(branch, { behindCount: behind, lastCommitDate });
                    } else if (ahead === 0 && behind === 0 && daysSinceCommit > 30) {
                        staleBranches.set(branch, lastCommitDate);
                    }
                }
            })
        );

        this.spinner.stop();

        return {
            mergedBranches,
            staleBranches,
            behindOnlyBranches,
            localOnlyBranches,
            divergedBranches,
        }
    }

    async run() {
        await this.parse(BranchCleanupCommand);
        this.timer.start("total");
        this.timer.start("response");

        const git = getSimpleGit();
        this.spinner.start();
        this.spinner.text = "Fetching repository...";
        try { await git.fetch(['--all']); } catch { LOGGER.warn(this, `Error fetching repository.`); }

        const { divergedBranches, mergedBranches, staleBranches, behindOnlyBranches, localOnlyBranches } = await this.getBranchCandidatesPerType()
        if (
            mergedBranches.size === 0 &&
            staleBranches.size === 0 &&
            behindOnlyBranches.size === 0 &&
            localOnlyBranches.size === 0 &&
            divergedBranches.size === 0
        ) {
            LOGGER.log(this, "✅ No cleanup candidates found.");
            this.logTotalTime();
            return;
        }


        if (allBranchesToDelete.length > 0) {
            this.spinner.start();
            let totalDeleted = 0;

            for (const branch of allBranchesToDelete) {
                try {
                    await git.branch(["-D", branch]);
                    LOGGER.log(this, `${chalk.red("✗")} Deleted: ${branch}`);
                    totalDeleted++;
                } catch (error) {
                    LOGGER.error(this, `Error deleting branch ${branch}: ${error}`);
                }
            }

            this.spinner.stop();
            LOGGER.log(this, `${chalk.green("✓")} Successfully deleted ${totalDeleted} branches!`);
        } else {
            LOGGER.log(this, "✅ No branches were deleted.");
        }

        this.logTotalTime();
    }

    getAllBranchesToDelete() {
        const categories: { label: string; map: Map<any, any> | Map<string, number>; }[] = [
            { label: "Merged Branches", map: mergedBranches },
            { label: "Only pending pulls (Behind)", map: behindOnlyBranches },
            { label: "Outdated & Diverged Branches (WARNING: Local changes!)", map: divergedBranches },
            { label: "Local branches without remote", map: localOnlyBranches },
            { label: "Stale branches (>30 days, synced)", map: staleBranches },
        ];

        const allBranchesToDelete: string[] = [];

        for (const category of categories) {
            if (category.map.size === 0) continue;

            const items: ListItem<string>[] = [];

            switch (category.label) {
                case "Local branches without remote": {
                    items.push(...[...category.map.entries()].map(([branch, lastCommitDate]) => ({
                        key: branch,
                        label: `${chalk.magenta(branch)} ${chalk.dim(`(Local only, active: ${dayjs(lastCommitDate).fromNow()})`)}`,
                        type: "item" as const,
                        value: branch
                    })));

                    break;
                }

                case "Merged Branches": {
                    const sorted = [...category.map.entries()].sort(
                        (a, b) =>
                            (this.branchImportanceScore.get(b[1].mostRelevantBranch) ?? 0) -
                            (this.branchImportanceScore.get(a[1].mostRelevantBranch) ?? 0)
                    );
                    items.push(...sorted.map(([branch, info]) => ({
                        key: branch,
                        label: `${chalk.yellow(branch)} ${chalk.dim("→")} ${chalk.green(info.mostRelevantBranch)} ${chalk.dim(`(${dayjs(info.lastCommitDate).fromNow()})`)}`,
                        type: "item" as const,
                        value: branch
                    })));

                    break;
                }

                case "Only pending pulls (Behind)": {
                    items.push(...[...category.map.entries()].map(([branch, info]) => ({
                        key: branch,
                        label: `${chalk.blue(branch)} ${chalk.dim(`(↓${info.behindCount}, active: ${dayjs(info.lastCommitDate).fromNow()})`)}`,
                        type: "item" as const,
                        value: branch
                    })));

                    break;
                }

                case "Outdated & Diverged Branches (WARNING: Local changes!)": {
                    items.push(...[...category.map.entries()].map(([branch, info]) => {
                        const aheadColor = info.ahead > 10 ? chalk.red : chalk.yellow;
                        const behindColor = info.behind > 50 ? chalk.red : chalk.blue;
                        return {
                            key: branch,
                            label: `${chalk.red.bold(branch)} ${chalk.dim("(")}${aheadColor(`↑${info.ahead}`)} ${behindColor(`↓${info.behind}`)}${chalk.dim(`, active: ${dayjs(info.lastCommitDate).fromNow()})`)}`,
                            type: "item" as const,
                            value: branch
                        };
                    }));

                    break;
                }

                case "Stale branches (>30 days, synced)": {
                    items.push(...[...category.map.entries()].map(([branch, lastCommitDate]) => ({
                        key: branch,
                        label: `${chalk.gray(branch)} ${chalk.dim(`(Synced, active: ${dayjs(lastCommitDate).fromNow()})`)}`,
                        type: "item" as const,
                        value: branch
                    })));

                    break;
                }
            }

            const branchesToDelete = this.flags.yes ? items.map(item => item.) : (await withPromptExit(this, () =>
                renderCheckboxList({ items, message: `Select branches to delete: ${category.label}` })
            ));

            allBranchesToDelete.push(...branchesToDelete);
        }

    }

    selectMostRelevantBranch(branches: string[]): string {
        if (branches.length === 0) return "";
        return branches.reduce((mostRelevant, current) =>
            (this.branchImportanceScore.get(current) ?? 0) > (this.branchImportanceScore.get(mostRelevant) ?? 0)
                ? current
                : mostRelevant
        );
    }
}
