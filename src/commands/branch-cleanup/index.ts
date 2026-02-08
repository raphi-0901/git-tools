import { Flags } from "@oclif/core";
import chalk from "chalk";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";
import { simpleGit } from "simple-git";

import { CommonFlagsBaseCommand } from "../../base-commands/CommonFlagsBaseCommand.js";
import { RemoteStatus } from "../../types/RemoteStatus.js";
import { renderCheckboxList } from "../../ui/CheckboxList.js";
import { analyzeBranches } from "../../utils/branchAnalyzer.js";
import { isProtectedBranch, protectedBranchPatterns } from "../../utils/branchProtection.js";
import { promptBranchesToDelete } from "../../utils/branchSelection.js";
import { getBranchesSummary } from "../../utils/branchSummary.js";
import { checkIfInGitRepository } from "../../utils/checkIfInGitRepository.js";
import { getRemoteNames } from "../../utils/getRemoteNames.js";
import { getSimpleGit } from "../../utils/getSimpleGit.js";
import * as LOGGER from "../../utils/logging.js";
import { parseUpstreamTrackLong } from "../../utils/parseUpstreamTrackLine.js";
import { stripRemotePrefix } from "../../utils/stripRemotePrefix.js";
import { withPromptExit } from "../../utils/withPromptExist.js";

dayjs.extend(relativeTime);

type ResolvedConfig = {
    protectedBranchPatterns: readonly RegExp[];
    staleDays: number;
    staleDaysBehind: number;
    staleDaysDiverged: number;
    staleDaysLocal: number;
}

export default class BranchCleanupCommand extends CommonFlagsBaseCommand<typeof BranchCleanupCommand> {
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
            default: 30,
            description: 'Number of days since last commit after which a branch is considered stale. If set without staleDaysDiverged/staleDaysLocal/staleDaysBehind, those will default to staleDays × 3.',
            min: 1,
            required: false,
        }),
        'staleDaysBehind': Flags.integer({
            aliases: ['stale-days-behind'],
            description: 'Number of days for behind-only branches (default: staleDays)',
            min: 1,
            required: false,
        }),
        'staleDaysDiverged': Flags.integer({
            aliases: ['stale-days-diverged'],
            description: 'Number of days for diverged branches (default: staleDays × 3)',
            min: 1,
            required: false,
        }),
        'staleDaysLocal': Flags.integer({
            aliases: ['stale-days-local'],
            description: 'Number of days for local-only branches (default: staleDays × 3)',
            min: 1,
            required: false,
        }),
        'targetSelection': Flags.boolean({
            aliases: ["target-selection"],
            description: 'Show a target branch selection. If not set, all protected branches will be considered as potential targets.',
            required: false,
        }),
    };
    public readonly configId = "branch-cleanup";
    private _localBranches: Set<string> = new Set();
    private _localBranchToLastCommitDateCache = new Map<string, number>();
    private _localBranchToRemoteStatusCache = new Map<string, RemoteStatus>();
    private _remoteBranches: Set<string> = new Set();
    private _userConfig: ResolvedConfig = {
        protectedBranchPatterns,
        staleDays: 30,
        staleDaysBehind: 30,
        staleDaysDiverged: 90,
        staleDaysLocal: 90,
    }

    get localBranchToLastCommitDateCache() {
        return this._localBranchToLastCommitDateCache;
    }

    get localBranchToRemoteStatusCache() {
        return this._localBranchToRemoteStatusCache;
    }

    get userConfig() {
        return this._userConfig;
    }

    async buildCacheForLocalBranches() {
        this.timer.start("cache-build");
        const git = simpleGit();

        const format =
            '%(refname:short)|%(if)%(upstream:short)%(then)%(upstream:short)%(else)%(end)|%(committerdate:unix)|%(upstream:track)';

        const lines = (await git.raw([
            'for-each-ref',
            `--format=${format}`,
            'refs/heads',
        ])).split("\n");

        for (const line of lines) {
            if (!line.trim()) {
                continue;
            }

            const [branchName, remoteBranchName, commitDate, track] = line.split("|")
            this._localBranchToLastCommitDateCache.set(branchName, Number.parseInt(commitDate, 10) * 1000);

            if (!remoteBranchName) {
                this._localBranchToRemoteStatusCache.set(branchName, {
                    type: "no-remote"
                });
                continue;
            }

            const trackingStatus = parseUpstreamTrackLong(track)
            if (!trackingStatus) {
                continue;
            }

            this._localBranchToRemoteStatusCache.set(branchName, {
                ...trackingStatus,
                remoteBranch: remoteBranchName
            })
        }

        LOGGER.debug(this, "Cache build took " + this.timer.stop("cache-build"))
    }

    async catch(error: unknown) {
        super.catch(error);
        this.log(chalk.red("🚫 Branch cleanup cancelled."));
    }

    async getPotentialTargets() {
        const remoteNames = await getRemoteNames()

        const formattedRemoteBranches = [...this._remoteBranches].map(branch => {
            const strippedBranch = stripRemotePrefix(branch, remoteNames)

            return {
                branch,
                selected: this._userConfig.protectedBranchPatterns.some(pattern => pattern.test(strippedBranch)),
            }
        })

        const formattedLocalBranches = [...this._localBranches].map(branch => ({
            branch,
            selected: this._userConfig.protectedBranchPatterns.some(pattern => pattern.test(branch)),
        }))

        if (this.flags.targetSelection) {
            const targetSelection = await withPromptExit(this, () => renderCheckboxList({
                items: [
                    { label: "Local branches", type: "separator" },
                    ...formattedLocalBranches.map(({ branch, selected }) => ({
                        key: branch,
                        label: branch,
                        selected,
                        type: "item" as const,
                        value: branch
                    })),

                    { label: "Remote branches", type: "separator" },
                    ...formattedRemoteBranches.map(({ branch, selected }) => ({
                        key: branch,
                        label: branch,
                        selected,
                        type: "item" as const,
                        value: branch
                    })),
                ],
                message: "Choose potential target branches: (not more than 10 branches will be considered)",
            }))

            return targetSelection.slice(0, 10)
        }

        return [...formattedRemoteBranches, ...formattedLocalBranches]
            .filter(branch => branch.selected)
            .map(branch => branch.branch)
            .slice(0, 10)
    }

    logTotalTime() {
        LOGGER.debug(this, `Action took ${this.timer.stop("total")}.`);
    }

    async run() {
        this.timer.start("total");
        this.spinner.start();
        await checkIfInGitRepository(this);

        this.storeFlagsIntoUserConfig()

        const git = getSimpleGit();

        // Load local and remote branches
        this.spinner.text = "Loading branches...";
        const { localBranches, remoteBranches } = await getBranchesSummary()
        this._remoteBranches = new Set(remoteBranches);
        this._localBranches = new Set(localBranches);
        this.spinner.stop();

        // parallelize fetching remote branches and building cache for last commit dates and remote status
        const [potentialTargets] = await Promise.all([
            this.getPotentialTargets(),
            this.buildCacheForLocalBranches()
        ])

        LOGGER.debug(this, `Potential target branches: ${potentialTargets.join(", ")}`)

        // Fetch all remotes
        this.spinner.text = "Fetching repository...";
        this.spinner.start()
        try {
            await git.fetch(["--all"]);
        } catch {
            LOGGER.warn(this, "Error fetching repository.");
        }

        // all locale branches that are not protected
        const candidateBranches = localBranches.filter(branch => !isProtectedBranch(branch, this._userConfig.protectedBranchPatterns));

        this.spinner.text = "Detecting branch states...";
        this.timer.start("branch-analysis");

        const analysis = await analyzeBranches(this, {
                branches: candidateBranches,
                potentialTargets,
            }
        );

        LOGGER.debug(this, `Branch analysis took ${this.timer.stop("branch-analysis")}`)
        this.spinner.stop();

        // Check if there are any branches to act on
        if (
            analysis.merged.size === 0 &&
            analysis.stale.size === 0 &&
            analysis.behindOnly.size === 0 &&
            analysis.abandoned.size === 0 &&
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
                    if (this.flags.dryRun) {
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

            if (this.flags.dryRun) {
                LOGGER.log(this, `${chalk.green("✓")} Would have deleted ${branchesToDelete.length} of ${localBranches.length} branches (dry run).`)
            } else {
                LOGGER.log(this, `${chalk.green("✓")} Successfully deleted ${branchesToDelete.length} of ${localBranches.length} branches!`);
            }
        }

        this.logTotalTime();
    }

    private storeFlagsIntoUserConfig() {
        const base = this.flags.staleDays ?? 30;

        this._userConfig = {
            protectedBranchPatterns: this.flags.protectedBranches
                ? this.flags.protectedBranches.map(pattern => new RegExp(pattern))
                : protectedBranchPatterns,
            staleDays: base,
            staleDaysBehind: this.flags.staleDaysBehind ?? base,
            staleDaysDiverged: this.flags.staleDaysDiverged ?? base * 3,
            staleDaysLocal: this.flags.staleDaysLocal ?? base * 3
        };
    }
}
