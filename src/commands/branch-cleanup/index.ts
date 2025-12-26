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
        debug: Flags.boolean({
            description: "Show debug logs.",
        }),
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
                    const raw = await git.raw([
                        "log",
                        branch,
                        "-n",
                        "1",
                        "--pretty=format:%ci",
                    ]);
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

    async findMergeTargets(
        sourceBranch: string,
        potentialTargets: string[]
    ): Promise<string[]> {
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

    async getRemoteStatus(branch: string): Promise<{ ahead: number; behind: number; hasRemote: boolean }> {
        const git = getSimpleGit();
        try {
            await git.raw(["rev-parse", "--verify", `origin/${branch}`]);
            const status = await git.raw(["rev-list", "--left-right", "--count", `${branch}...origin/${branch}`]);
            const [ahead, behind] = status.trim().split("\t").map(n => Number.parseInt(n, 10));
            return { ahead, behind, hasRemote: true };
        } catch {
            return { ahead: 0, behind: 0, hasRemote: false };
        }
    }

    async identifyPotentialTargetBranches(
        allBranches: string[],
        remoteBranches: string[]
    ): Promise<string[]> {
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

        const targets = topBranches.slice(0, Math.max(5, Math.min(15, topBranches.length)));
        return targets;
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

    async isUpToDateWithRemote(branch: string): Promise<boolean> {
        const git = getSimpleGit();
        try {
            const status = await git.raw(["rev-list", "--left-right", "--count", `${branch}...origin/${branch}`]);
            return status.trim() === "0\t0";
        } catch {
            return false;
        }
    }

    logTotalTime() {
        LOGGER.debug(this, `Action took ${this.timer.stop("total")}.`);
    }

    async run() {
        await this.parse(BranchCleanupCommand);
        this.timer.start("total");
        this.timer.start("response");

        const git = getSimpleGit();
        this.spinner.start();
        this.spinner.text = "Fetching repository...";
        try { await git.fetch(['--all']); } catch{ LOGGER.warn(this, `Error fetching repository.`); }

        this.spinner.text = "Loading branches...";
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
                        // Diverged: Hat eigene Arbeit, hinkt aber hinterher
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
        if (mergedBranches.size === 0 && staleBranches.size === 0 && behindOnlyBranches.size === 0 && localOnlyBranches.size === 0 && divergedBranches.size === 0) {
            LOGGER.log(this, "✅ No cleanup candidates found.");
            this.logTotalTime();
            return;
        }

        const items: ListItem<string>[] = [];

        if (mergedBranches.size > 0) {
            items.push({ label: `Gemergte Branches (${mergedBranches.size})`, type: "separator" });
            const sorted = [...mergedBranches.entries()].sort((a, b) => (this.branchImportanceScore.get(b[1].mostRelevantBranch) ?? 0) - (this.branchImportanceScore.get(a[1].mostRelevantBranch) ?? 0));
            items.push(...sorted.map(([branch, info]) => ({
                key: branch, label: `${chalk.yellow(branch)} ${chalk.dim("→")} ${chalk.green(info.mostRelevantBranch)} ${chalk.dim(`(${dayjs(info.lastCommitDate).fromNow()})`)}`, type: "item" as const, value: branch
            })));
        }

        if (behindOnlyBranches.size > 0) {
            items.push({ label: `Nur ausstehende Pulls (Behind)`, type: "separator" });
            items.push(...[...behindOnlyBranches.entries()].map(([branch, info]) => ({
                key: branch, label: `${chalk.blue(branch)} ${chalk.dim(`(↓${info.behindCount}, aktiv: ${dayjs(info.lastCommitDate).fromNow()})`)}`, type: "item" as const, value: branch
            })));
        }

        if (divergedBranches.size > 0) {
            items.push({ label: `Veraltete & Divergierte Branches (ACHTUNG: Lokale Änderungen!)`, type: "separator" });
            items.push(...[...divergedBranches.entries()].map(([branch, info]) => {
                const aheadColor = info.ahead > 10 ? chalk.red : chalk.yellow;
                const behindColor = info.behind > 50 ? chalk.red : chalk.blue;
                return {
                    key: branch,
                    label: `${chalk.red.bold(branch)} ${chalk.dim("(")}${aheadColor(`↑${info.ahead}`)} ${behindColor(`↓${info.behind}`)}${chalk.dim(`, aktiv: ${dayjs(info.lastCommitDate).fromNow()})`)}`,
                    type: "item" as const,
                    value: branch
                };
            }));
        }

        if (localOnlyBranches.size > 0) {
            items.push({ label: `Lokale Branches ohne Remote`, type: "separator" }, ...[...localOnlyBranches.entries()].map(([branch, lastCommitDate]) => ({
                key: branch, label: `${chalk.magenta(branch)} ${chalk.dim(`(Nur lokal, aktiv: ${dayjs(lastCommitDate).fromNow()})`)}`, type: "item" as const, value: branch
            })));
        }

        if (staleBranches.size > 0) {
            items.push({ label: `Veraltete Branches (>30 Tage, synchron)`, type: "separator" }, ...[...staleBranches.entries()].map(([branch, lastCommitDate]) => ({
                key: branch, label: `${chalk.gray(branch)} ${chalk.dim(`(Synchron, aktiv: ${dayjs(lastCommitDate).fromNow()})`)}`, type: "item" as const, value: branch
            })));
        }

        const branchesToDelete = await withPromptExit(this, () => renderCheckboxList({ items, message: "Wähle Branches zum Löschen:" }));

        if (branchesToDelete.length > 0) {
            this.spinner.start();
            for (const branch of branchesToDelete) {
                // Bei divergierten Branches nutzen wir -D statt -d, um das Löschen trotz fehlendem Merge zu erzwingen
                const isDiverged = divergedBranches.has(branch) || localOnlyBranches.has(branch);
                try {
                    await git.branch([isDiverged ? "-D" : "-d", branch]);
                    LOGGER.log(this, `${chalk.red("✗")} Deleted: ${branch}`);
                }
                catch (error) {
                    LOGGER.error(this, `Error deleting branch ${branch}: ${error}`);
                }
            }

            this.spinner.stop();
            LOGGER.log(this, `${chalk.green("✓")} Successfully deleted ${branchesToDelete.length} branches!`);
        }

        this.logTotalTime();
    }

    selectMostRelevantBranch(branches: string[]): string {
        if (branches.length === 0) return "";
        return branches.reduce((mostRelevant, current) => (this.branchImportanceScore.get(current) ?? 0) > (this.branchImportanceScore.get(mostRelevant) ?? 0) ? current : mostRelevant);
    }
}
