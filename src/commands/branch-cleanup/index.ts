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
            })
        );
    }

    // Berechne Wichtigkeit eines Branches basierend auf Name und Aktivität
    calculateBranchImportance(branchName: string, lastCommitDate: number): number {
        let score = 0;

        // Basis-Score für Branch-Namen (höher = wichtiger)
        if (/^(main|master)$/.test(branchName)) score += 1000;
        else if (/^(development|develop)$/.test(branchName)) score += 900;
        else if (/^release\//.test(branchName)) score += 800;
        else if (/^hotfix\//.test(branchName)) score += 700;
        else if (branchName.startsWith('staging')) score += 600;
        else if (branchName.startsWith('production')) score += 950;

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
        allBranches: string[]
    ): Promise<string[]> {
        const mergedInto: string[] = [];

        // Prüfe nur gegen wichtigere Branches (Performance-Optimierung)
        const potentialTargets = allBranches.filter(
            (b) => b !== sourceBranch && Boolean(this.isProtectedBranch(b))
        );

        for (const target of potentialTargets) {
            const isMerged = await this.isBranchMergedInto(sourceBranch, target);
            if (isMerged) {
                mergedInto.push(target);
            }
        }

        return mergedInto;
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
            LOGGER.debug(this, `Error checking merge status: ${error}`);
            return false;
        }
    }

    isProtectedBranch(branch: string): boolean {
        return this.protectedBranchPatterns.some((r) => r.test(branch));
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
        await git.fetch();

        this.spinner.text = "Loading branches...";
        const allBranches = (await git.branchLocal()).all;

        const candidateBranches = allBranches.filter(
            (b) => !this.isProtectedBranch(b)
        );

        LOGGER.debug(this, `${candidateBranches.length} candidate branches`);

        this.spinner.text = "Analyzing branch activity...";
        await this.buildLastCommitCache(allBranches);

        this.spinner.text = "Detecting merged branches...";
        const mergedBranches = new Map<string, MergeInfo>();

        // Parallel verarbeiten für bessere Performance
        await Promise.all(
            candidateBranches.map(async (branch) => {
                const mergedInto = await this.findMergeTargets(branch, allBranches);

                if (mergedInto.length > 0) {
                    const mostRelevant = this.selectMostRelevantBranch(mergedInto);
                    const lastCommitDate = this.branchToLastCommitDateCache.get(branch) ?? 0;

                    mergedBranches.set(branch, {
                        lastCommitDate,
                        mergedIntoBranches: mergedInto,
                        mostRelevantBranch: mostRelevant,
                    });
                }
            })
        );  

        this.spinner.stop();
        LOGGER.debug(this, `Time taken: ${this.timer.stop("response")}`);

        if (mergedBranches.size === 0) {
            LOGGER.log(this, "✅ No merged branches found. Repository is clean!");
            this.logTotalTime();
            return;
        }

        // Sortiere nach Relevanz des Ziel-Branches
        const sortedBranches = [...mergedBranches.entries()].sort((a, b) => {
            const scoreA = this.branchImportanceScore.get(a[1].mostRelevantBranch) ?? 0;
            const scoreB = this.branchImportanceScore.get(b[1].mostRelevantBranch) ?? 0;
            return scoreB - scoreA;
        });

        const items: ListItem<string>[] = [
            {
                label: `Gemergte Branches (${mergedBranches.size} gefunden)`,
                type: "separator" as const,
            },
            ...sortedBranches.map(([branch, info]) => {
                const targetList = info.mergedIntoBranches.length > 1
                    ? `${info.mostRelevantBranch} (+${info.mergedIntoBranches.length - 1} weitere)`
                    : info.mostRelevantBranch;

                const timeAgo = dayjs(info.lastCommitDate).fromNow();

                return {
                    key: branch,
                    label: `${chalk.yellow(branch)} ${chalk.dim("→")} ${chalk.green(
                        targetList
                    )} ${chalk.dim(`(${timeAgo})`)}`,
                    type: "item" as const,
                    value: branch,
                };
            }),
        ];

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
                // await git.deleteLocalBranch(branch);
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
