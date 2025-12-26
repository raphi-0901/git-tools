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

                    // Berechne Wichtigkeit
                    const importance = this.calculateBranchImportance(branch, date);
                    this.branchImportanceScore.set(branch, importance);
                } catch (error) {
                    LOGGER.debug(this, `Error getting commit date for ${branch}: ${error}`);
                }
            })
        );
    }

    // Berechne Wichtigkeit eines Branches basierend auf Name und Aktivität
    calculateBranchImportance(branchName: string, lastCommitDate: number): number {
        let score = 0;

        // Normalisiere Branch-Namen (entferne origin/ prefix)
        const normalizedName = branchName.replace(/^origin\//, '');

        // Basis-Score für Branch-Namen (höher = wichtiger)
        if (/^(main|master)$/.test(normalizedName)) score += 1000;
        else if (/^(development|develop)$/.test(normalizedName)) score += 900;
        else if (/^release\//.test(normalizedName)) score += 800;
        else if (/^hotfix\//.test(normalizedName)) score += 700;
        else if (normalizedName.startsWith('staging')) score += 600;
        else if (normalizedName.startsWith('production')) score += 950;

        // Aktivitäts-Score (neuere Branches sind wichtiger)
        const daysSinceCommit = (Date.now() - lastCommitDate) / (1000 * 60 * 60 * 24);
        const activityScore = Math.max(0, 100 - daysSinceCommit);

        return score + activityScore;
    }

    async catch(error: unknown) {
        super.catch(error);
        this.log(chalk.red("🚫 Branch cleanup cancelled."));
    }

    // Finde alle Branches, in die ein Branch gemerged wurde
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

    // Identifiziere dynamisch die wichtigsten Target-Branches
    async identifyPotentialTargetBranches(
        allBranches: string[],
        remoteBranches: string[]
    ): Promise<string[]> {
        const git = getSimpleGit();

        // Kombiniere lokale und remote branches für die Analyse
        const allAvailableBranches = [
            ...allBranches,
            ...remoteBranches
        ];

        const branchStats = new Map<string, { commitCount: number; lastCommitDate: number }>();

        // Sammle Statistiken für alle Branches
        await Promise.all(
            allAvailableBranches.map(async (branch) => {
                try {
                    // Zähle Commits
                    const commitCountRaw = await git.raw(["rev-list", "--count", branch]);
                    const commitCount = Number.parseInt(commitCountRaw.trim(), 10);

                    // Hole letztes Commit Datum
                    const dateRaw = await git.raw([
                        "log",
                        branch,
                        "-n",
                        "1",
                        "--pretty=format:%ci",
                    ]);
                    const lastCommitDate = new Date(dateRaw.trim()).getTime();

                    branchStats.set(branch, { commitCount, lastCommitDate });

                    // Speichere auch im Cache für spätere Verwendung
                    this.branchToLastCommitDateCache.set(branch, lastCommitDate);
                } catch (error) {
                    LOGGER.debug(this, `Error getting stats for ${branch}: ${error}`);
                }
            })
        );

        // Score-Berechnung für jeden Branch
        const branchScores = allAvailableBranches.map((branch) => {
            const stats = branchStats.get(branch);
            if (!stats) return { branch, score: 0 };

            let score = 0;

            // Normalisiere Branch-Namen (entferne origin/ prefix für Matching)
            const normalizedBranch = branch.replace(/^origin\//, '');

            // 1. Geschützte Branches haben höchste Priorität
            if (this.isProtectedBranch(normalizedBranch)) {
                score += 10_000;
            }

            // 2. Commit-Count (mehr Commits = wahrscheinlich wichtiger)
            score += Math.log(stats.commitCount + 1) * 100;

            // 3. Aktivität (neuere Branches wichtiger)
            const daysSinceCommit = (Date.now() - stats.lastCommitDate) / (1000 * 60 * 60 * 24);
            score += Math.max(0, 500 - daysSinceCommit);

            // 4. Name-basierte Heuristiken
            if (/^(main|master|production|prod)$/i.test(normalizedBranch)) score += 5000;
            else if (/^(development|develop|dev)$/i.test(normalizedBranch)) score += 4000;
            else if (/^(staging|stage)$/i.test(normalizedBranch)) score += 3000;
            else if (/^(release|hotfix)\//i.test(normalizedBranch)) score += 2000;
            else if (/^(feature|feat)\//i.test(normalizedBranch)) score -= 500; // Feature-Branches weniger wichtig

            return { branch, score };
        });

        // Sortiere nach Score und nimm die Top-Branches
        const sortedBranches = branchScores
            .sort((a, b) => b.score - a.score)
            .map((b) => b.branch);

        // Nimm die Top 10 oder alle mit Score > 1000
        const threshold = 1000;
        const topBranches = sortedBranches.filter((branch) => {
            const score = branchScores.find((b) => b.branch === branch)?.score ?? 0;
            return score > threshold;
        });

        // Mindestens die Top 5, maximal Top 15
        const minTargets = 5;
        const maxTargets = 15;
        const targets = topBranches.slice(0, Math.max(minTargets, Math.min(maxTargets, topBranches.length)));

        LOGGER.debug(this, `Identified ${targets.length} potential target branches: ${targets.join(", ")}`);

        return targets;
    }

    // Prüfe ob Branch A vollständig in Branch B gemerged wurde
    async isBranchMergedInto(
        sourceBranch: string,
        targetBranch: string
    ): Promise<boolean> {
        const git = getSimpleGit();

        try {
            // Git kann direkt prüfen ob ein Branch gemerged wurde
            // Wenn die Ausgabe leer ist, wurde der Branch NICHT gemerged
            const result = await git.raw([
                "log",
                `${targetBranch}..${sourceBranch}`,
                "--oneline",
            ]);

            return result.trim() === "";
        } catch (error) {
            LOGGER.debug(this, `Error checking merge status for ${sourceBranch} into ${targetBranch}: ${error}`);
            return false;
        }
    }

    isProtectedBranch(branch: string): boolean {
        return this.protectedBranchPatterns.some((r) => r.test(branch));
    }

    // Prüft, ob der lokale Branch exakt auf dem Stand des Remotes ist
    async isUpToDateWithRemote(branch: string): Promise<boolean> {
        const git = getSimpleGit();
        try {
            const status = await git.raw(["rev-list", "--left-right", "--count", `${branch}...origin/${branch}`]);
            // Status Format: "0\t0" (ahead\tbehind)
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
        try {
            await git.fetch(['--all']);
        }
        catch(error) {
            LOGGER.warn(this, `Error fetching repository. Will try to continue without it.`);
            LOGGER.debug(this, `Error fetching repository: ${error}`);
        }

        this.spinner.text = "Loading branches...";
        const allBranches = (await git.branchLocal()).all;

        const remoteBranchesRaw = (await git.branch(['-r'])).all;
        const remoteBranches = remoteBranchesRaw
            .filter(b => !b.includes('HEAD ->'))
            .map(b => b.trim());

        LOGGER.debug(this, `Local branches: ${allBranches.length}, Remote branches: ${remoteBranches.length}`);

        const candidateBranches = allBranches.filter(
            (b) => !this.isProtectedBranch(b)
        );

        this.spinner.text = "Analyzing branch activity...";
        await this.buildLastCommitCache(allBranches);

        this.spinner.text = "Identifying important target branches...";
        const potentialTargets = await this.identifyPotentialTargetBranches(
            allBranches,
            remoteBranches
        );

        this.spinner.text = "Detecting branch states...";
        const mergedBranches = new Map<string, MergeInfo>();
        const staleBranches = new Map<string, number>();

        await Promise.all(
            candidateBranches.map(async (branch) => {
                const mergedInto = await this.findMergeTargets(branch, potentialTargets);
                const lastCommitDate = this.branchToLastCommitDateCache.get(branch) ?? 0;

                if (mergedInto.length > 0) {
                    const mostRelevant = this.selectMostRelevantBranch(mergedInto);
                    mergedBranches.set(branch, {
                        lastCommitDate,
                        mergedIntoBranches: mergedInto,
                        mostRelevantBranch: mostRelevant,
                    });
                } else {
                    // Check for stale but up-to-date branches
                    const daysSinceCommit = (Date.now() - lastCommitDate) / (1000 * 60 * 60 * 24);
                    if (daysSinceCommit > 30) {
                        const isSynced = await this.isUpToDateWithRemote(branch);
                        if (isSynced) {
                            staleBranches.set(branch, lastCommitDate);
                        }
                    }
                }
            })
        );

        this.spinner.stop();
        LOGGER.debug(this, `Time taken: ${this.timer.stop("response")}`);

        if (mergedBranches.size === 0 && staleBranches.size === 0) {
            LOGGER.log(this, "✅ No cleanup candidates found. Repository is clean!");
            this.logTotalTime();
            return;
        }

        const items: ListItem<string>[] = [];

        if (mergedBranches.size > 0) {
            items.push({
                label: `Gemergte Branches (${mergedBranches.size} gefunden)`,
                type: "separator" as const,
            });

            const sortedMerged = [...mergedBranches.entries()].sort((a, b) => {
                const scoreA = this.branchImportanceScore.get(a[1].mostRelevantBranch) ?? 0;
                const scoreB = this.branchImportanceScore.get(b[1].mostRelevantBranch) ?? 0;
                return scoreB - scoreA;
            });

            items.push(...sortedMerged.map(([branch, info]) => {
                const targetList = info.mergedIntoBranches.length > 1
                    ? `${info.mostRelevantBranch} (+${info.mergedIntoBranches.length - 1} weitere)`
                    : info.mostRelevantBranch;
                const timeAgo = dayjs(info.lastCommitDate).fromNow();
                return {
                    key: branch,
                    label: `${chalk.yellow(branch)} ${chalk.dim("→")} ${chalk.green(targetList)} ${chalk.dim(`(${timeAgo})`)}`,
                    type: "item" as const,
                    value: branch,
                };
            }));
        }

        if (staleBranches.size > 0) {
            items.push({
                label: `Veraltete Branches (nicht gemergt, aber synchron mit Remote, >30 Tage alt)`,
                type: "separator" as const,
            });

            const sortedStale = [...staleBranches.entries()].sort((a, b) => a[1] - b[1]);

            items.push(...sortedStale.map(([branch, lastCommitDate]) => ({
                key: branch,
                label: `${chalk.red(branch)} ${chalk.dim(`(Zuletzt aktiv: ${dayjs(lastCommitDate).fromNow()})`)}`,
                type: "item" as const,
                value: branch,
            })));
        }

        const branchesToDelete = this.flags.yes
            ? []
            : await withPromptExit(this, () =>
                renderCheckboxList({
                    items,
                    message: "Wähle die Branches aus, die du löschen möchtest:",
                })
            );

        if (branchesToDelete.length > 0) {
            this.spinner.start();
            this.spinner.text = `Deleting ${branchesToDelete.length} branches...`;

            for (const branch of branchesToDelete) {
                await git.deleteLocalBranch(branch);
                LOGGER.log(this, `${chalk.red("✗")} Deleted: ${branch}`);
            }

            this.spinner.stop();
            LOGGER.log(
                this,
                `${chalk.green("✓")} Successfully deleted ${branchesToDelete.length} branches!`
            );
        }

        this.logTotalTime();
    }

    // Wähle den relevantesten Branch aus einer Liste
    selectMostRelevantBranch(branches: string[]): string {
        if (branches.length === 0) return "";

        return branches.reduce((mostRelevant, current) => {
            const currentScore = this.branchImportanceScore.get(current) ?? 0;
            const mostRelevantScore = this.branchImportanceScore.get(mostRelevant) ?? 0;

            return currentScore > mostRelevantScore ? current : mostRelevant;
        });
    }
}
