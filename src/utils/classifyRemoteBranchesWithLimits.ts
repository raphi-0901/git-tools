import { BaseCommand } from "../base-commands/BaseCommand.js";
import { calculateAbsoluteDayDifference } from "./calculateAbsoluteDayDifference.js";
import { getSimpleGit } from "./getSimpleGit.js";
import { isBranchMergedInto } from "./isBranchMergedInto.js";
import * as LOGGER from "./logging.js";

type BranchSets = {
    abandoned: Set<string>;
    behindOnly: Set<string>
    experiments: Set<string>;
    pendingPush: Set<string>;
    synchronizedNeeded: Set<string>;
    synchronizedOld: Set<string>;
};

type LimitConfig = {
    abandoned: number;
    behindOnly: number;
    experiments: number;
    pendingPush: number;
    synchronizedNeeded: number;
    synchronizedOld: number;
};

type ClassifyRemoteBranchesWithLimitsOptions = {
    limits?: LimitConfig;
    mergeTarget: string;
    remoteBranches: string[];
}

export async function classifyRemoteBranchesWithLimits(
    ctx: BaseCommand,
    options: ClassifyRemoteBranchesWithLimitsOptions,
): Promise<BranchSets> {
    const { limits, mergeTarget, remoteBranches } = options;
    const git = getSimpleGit();
    const finalLimits = limits ?? {
        abandoned: 10,
        behindOnly: 10,
        experiments: 10,
        pendingPush: 5,
        synchronizedNeeded: 5,
        synchronizedOld: 10,
    }

    const sets: BranchSets = {
        abandoned: new Set(),
        behindOnly: new Set(),
        experiments: new Set(),
        pendingPush: new Set(),
        synchronizedNeeded: new Set(),
        synchronizedOld: new Set(),
    };

    for (const branch of remoteBranches) {
        // short-circuit if everything is full
        if (
            sets.abandoned.size >= finalLimits.abandoned &&
            sets.experiments.size >= finalLimits.experiments &&
            sets.synchronizedOld.size >= finalLimits.synchronizedOld &&
            sets.synchronizedNeeded.size >= finalLimits.synchronizedNeeded &&
            sets.pendingPush.size >= finalLimits.pendingPush &&
            sets.behindOnly.size >= finalLimits.behindOnly
        ) {
            break;
        }

        const isAlreadyMerged = await isBranchMergedInto(branch, mergeTarget);
        const lastCommitDateStr = await git.raw(["log", "-1", branch, "--pretty=%ai"]);
        const lastCommitDate = new Date(lastCommitDateStr);
        const ageInDays = calculateAbsoluteDayDifference(lastCommitDate, new Date());

        // ---- PRIORITY ORDER (FIRST MATCH WINS) ----
        if (!isAlreadyMerged && ageInDays >= 90 && sets.synchronizedOld.size < finalLimits.synchronizedOld) {
            sets.synchronizedOld.add(branch);
            continue;
        }

        if (!isAlreadyMerged && ageInDays < 30 && sets.synchronizedNeeded.size < finalLimits.synchronizedNeeded) {
            sets.synchronizedNeeded.add(branch);
            continue
        }

        // gets modified, so no isAlreadyMerged check needed
        if (ageInDays >= 90 && sets.abandoned.size < finalLimits.abandoned) {
            sets.abandoned.add(branch);
            continue;
        }

        // gets modified, so no isAlreadyMerged check needed
        if(ageInDays >= 90 && sets.behindOnly.size < finalLimits.behindOnly) {
            sets.behindOnly.add(branch);
            continue;
        }

        // gets modified, so no isAlreadyMerged check needed
        if (ageInDays >= 30 &&sets.experiments.size < finalLimits.experiments) {
            sets.experiments.add(branch);
            continue;
        }

        // gets modified, so no isAlreadyMerged check needed
        if(sets.pendingPush.size < finalLimits.pendingPush) {
            sets.pendingPush.add(branch);
        }

        // otherwise: branch is intentionally ignored
    }

    LOGGER.log(ctx, `Classifying Statistics:`);
    LOGGER.log(ctx, `Abandoned: ${sets.abandoned.size} of ${finalLimits.abandoned}`);
    LOGGER.log(ctx, `Behind Only: ${sets.behindOnly.size} of ${finalLimits.behindOnly}`);
    LOGGER.log(ctx, `Experiments: ${sets.experiments.size} of ${finalLimits.experiments}`);
    LOGGER.log(ctx, `Pending Push: ${sets.pendingPush.size} of ${finalLimits.pendingPush}`);
    LOGGER.log(ctx, `Synchronized Needed: ${sets.synchronizedNeeded.size} of ${finalLimits.synchronizedNeeded}`);
    LOGGER.log(ctx, `Synchronized Old: ${sets.synchronizedOld.size} of ${finalLimits.synchronizedOld}`);
    LOGGER.log(ctx, `Total: ${Object.values(sets).reduce((acc, current) => acc + current.size, 0)} of ${Object.values(finalLimits).reduce((acc, current) => acc + current, 0)}`);
    LOGGER.log(ctx, '-'.repeat(20));

    return sets;
}

