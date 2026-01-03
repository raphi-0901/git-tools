import chalk from "chalk";
import dayjs from "dayjs";

import { BaseCommand } from "../base-commands/BaseCommand.js";
import { BehindInfo } from "../types/BehindInfo.js";
import { BranchAnalysisResult } from "../types/BranchAnalysisResult.js";
import { DivergedInfo } from "../types/DivergedInfo.js";
import { MergeInfo } from "../types/MergeInfo.js";
import { renderCheckboxList } from "../ui/CheckboxList.js";
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

export async function promptBranchesToDelete(
    ctx: BaseCommand,
    analysis: BranchAnalysisResult,
    autoConfirm: boolean,
) {
    const { behindOnly, diverged, localOnly, merged, stale } = analysis;

    if (autoConfirm) {
        return [
            ...merged.keys(),
            ...behindOnly.keys(),
            ...diverged.keys(),
            ...localOnly.keys(),
            ...stale.keys()
        ];
    }

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
            label: `Only pending pulls (Behind)`,
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
            label: `Outdated & Diverged Branches (WARNING: Local changes!)`,
            message: "Diverged & outdated branches to delete:",
            type: "diverged",
        },
        {
            branches: localOnly,
            formatLabel: (branch, lastCommitDate) =>
                `${chalk.magenta(branch)} ${chalk.dim(`(Local only, active: ${dayjs(lastCommitDate).fromNow()})`)}`,
            label: `Local branches without remote`,
            message: "Local and abandoned branches to delete:",
            type: "localOnly",
        },
        {
            branches: stale,
            formatLabel: (branch, lastCommitDate) =>
                `${chalk.gray(branch)} ${chalk.dim(`(Synced, active: ${dayjs(lastCommitDate).fromNow()})`)}`,
            label: `Stale branches (>30 days, synced)`,
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
