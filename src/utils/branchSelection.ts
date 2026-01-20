import chalk from "chalk";
import dayjs from "dayjs";

import { BaseCommand } from "../base-commands/BaseCommand.js";
import BranchCleanupCommand from "../commands/branch-cleanup/index.js";
import { BehindInfo } from "../types/BehindInfo.js";
import { DivergedInfo } from "../types/DivergedInfo.js";
import { MergeInfo } from "../types/MergeInfo.js";
import { renderCheckboxList } from "../ui/CheckboxList.js";
import { BranchAnalysisResult } from "./branchAnalyzer.js";
import { withPromptExit } from "./withPromptExist.js";

type MapValue<T> = T extends Map<unknown, infer V> ? V : never;

type BranchInfoMap = {
    behindOnly: BehindInfo;
    diverged: DivergedInfo;
    localOnly: number;
    merged: MergeInfo;
    stale: number;
}

// Distributive BranchCategory Map
type BranchCategoryMap = {
    [K in keyof BranchInfoMap]: {
        branches: Map<string, BranchInfoMap[K]>;
        formatLabel: (branch: string, info: BranchInfoMap[K]) => string;
        label: string;
        message: string;
        type: K;
    }
};

type BranchCategory = BranchCategoryMap[keyof BranchCategoryMap];

/**
 * Prompts the user to select branches to delete based on analysis categories.
 *
 * Categories include:
 * - Merged branches
 * - Behind (pending pull) branches
 * - Diverged/outdated branches
 * - Local-only branches
 * - Stale branches
 *
 * If `autoConfirm` is true, all branches from all categories are automatically selected.
 *
 * @param {BaseCommand} ctx - The command context for logging and prompts.
 * @param {BranchAnalysisResult} analysis - Object containing branch categories and their info.
 * @param {boolean} autoConfirm - If true, returns all branches automatically without prompting.
 *
 * @returns {Promise<string[]>} A list of branch names that the user confirmed for deletion.
 *
 * @example
 * const branchesToDelete = await promptBranchesToDelete(ctx, analysis, false);
 * console.log("Branches to delete:", branchesToDelete);
 */
export async function promptBranchesToDelete(
    ctx: BranchCleanupCommand,
    analysis: BranchAnalysisResult,
    autoConfirm: boolean,
): Promise<string[]> {
    const { abandoned, behindOnly, diverged, merged, stale } = analysis;

    if (autoConfirm) {
        return [
            ...merged.keys(),
            ...behindOnly.keys(),
            ...diverged.keys(),
            ...abandoned.keys(),
            ...stale.keys()
        ];
    }

    const { staleDays, staleDaysDiverged, staleDaysLocal } = ctx.userConfig;

    const categories: BranchCategory[] = [
        {
            branches: merged,
            formatLabel: (branch, info) =>
                `${chalk.yellow(branch)} ${chalk.dim("→")} ${chalk.green(info.mergedInto)} ${chalk.dim(`(${dayjs(info.lastCommitDate).fromNow()})`)}`,
            label: `Merged Branches (${merged.size})`,
            message: "Merged branches to delete:",
            type: "merged",
        },
        {
            branches: behindOnly,
            formatLabel: (branch, info) =>
                `${chalk.blue(branch)} ${chalk.dim(`(↓${info.behind}, active: ${dayjs(info.lastCommitDate).fromNow()})`)}`,
            label: `Only pending pulls (Behind) (${behindOnly.size})`,
            message: "Behind branches to delete:",
            type: "behindOnly",
        },
        {
            branches: diverged,
            formatLabel(branch, info) {
                const aheadColor = info.ahead > 10 ? chalk.red : chalk.yellow;
                const behindColor = info.behind > 50 ? chalk.red : chalk.blue;
                return `${chalk.red.bold(branch)} ${chalk.dim("(")}${aheadColor(`↑${info.ahead}`)} ${behindColor(`↓${info.behind}`)}${chalk.dim(`, active: ${dayjs(info.lastCommitDate).fromNow()})`)}`;
            },
            label: `Stale (>${staleDaysDiverged} days) & Diverged Branches (WARNING: Local changes!) (${diverged.size})`,
            message: "Diverged & outdated branches to delete:",
            type: "diverged",
        },
        {
            branches: abandoned,
            formatLabel: (branch, lastCommitDate) =>
                `${chalk.magenta(branch)} ${chalk.dim(`(Local only, active: ${dayjs(lastCommitDate).fromNow()})`)}`,
            label: `Stale Local branches (>${staleDaysLocal} days) without remote counterpart (${abandoned.size})`,
            message: "Local and abandoned branches to delete:",
            type: "localOnly",
        },
        {
            branches: stale,
            formatLabel: (branch, lastCommitDate) =>
                `${chalk.gray(branch)} ${chalk.dim(`(Synced, active: ${dayjs(lastCommitDate).fromNow()})`)}`,
            label: `Stale branches (>${staleDays} days, synced) (${stale.size})`,
            message: "Stale branches to delete:",
            type: "stale",
        },
    ];

    const branchesToDelete = new Set<string>();

    for (const category of categories) {
        if (category.branches.size > 0) {
            const branches = await promptBranchCategory(ctx, category);
            for (const branch of branches) branchesToDelete.add(branch);
        }
    }

    return [...branchesToDelete];
}

/**
 * Prompts the user with a checkbox list for a single branch category.
 *
 * @param {BaseCommand} ctx - The command context for rendering the prompt.
 * @param {BranchCategory} category - The category of branches to display.
 *
 * @returns {Promise<string[]>} The branches selected by the user in this category.
 *
 * @internal
 */
async function promptBranchCategory(
    ctx: BaseCommand,
    category: BranchCategory
): Promise<string[]> {
    const entries = [...category.branches.entries()] as [string, MapValue<typeof category.branches>][];

    return withPromptExit(ctx, () =>
        renderCheckboxList({
            items: [
                { label: category.label, type: "separator" },
                ...entries.map(([branch, info]) => ({
                    key: branch,
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-expect-error
                    label: category.formatLabel(branch, info),
                    type: "item" as const,
                    value: branch,
                })),
            ],
            message: category.message,
        })
    );
}
