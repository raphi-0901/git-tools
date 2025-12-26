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
    hash: string;
    mergeDate: number;
    target: string;
};

export default class BranchCleanupCommand extends BaseCommand {
    static flags = {
        debug: Flags.boolean({
            description: "Show debug logs.",
        }),
    };
    public readonly configId = "branch-cleanup";
    private branchToLastCommitDateCache = new Map<string, number>()
    private branchToLastCommitHashCache = new Map<string, string>()
    private commitHashToBranchCache = new Map<string, Set<string>>()
    private readonly protectedBranchPatterns = [
        /^main$/,
        /^master$/,
        /^development$/,
        /^release\//,
        /^hotfix\//,
    ];

    // --- Build Commit -> Branch map (in-memory) ---
    async buildCommitToBranchMap(branches: string[]) {
        const git = getSimpleGit();

        await Promise.all(
            branches.map(async branch => {
                const commitsRaw = await git.raw(["rev-list", branch]);
                for (const hash of commitsRaw.split("\n")) {
                    if (!this.commitHashToBranchCache.has(hash)) {
                        this.commitHashToBranchCache.set(hash, new Set());
                    }

                    this.commitHashToBranchCache.get(hash)!.add(branch);
                }
            })
        );
    }

    // --- Build Last Commit Cache parallel ---
    async buildLastCommitCacheParallel(
        branches: string[]
    ) {
        const git = getSimpleGit();
        await Promise.all(
            branches.map(async branch => {
                const raw = await git.raw([
                    "log",
                    branch,
                    "-n",
                    "1",
                    "--pretty=format:%H|%ci",
                ]);

                const [hash, date] = raw.split("|");

                this.branchToLastCommitDateCache.set(branch, new Date(date.trim()).getTime());
                this.branchToLastCommitHashCache.set(branch, hash);
            })
        );
    }

    async catch(error: unknown) {
        super.catch(error);
        this.log(chalk.red("🚫 Branch cleanup cancelled."));
    }

    /**
     * For each merge commit, selects the target branch
     * that had commits AFTER the merge and is the most recently active.
     *
     * Key of the result map = source commit (second parent)
     */
    async getDirectMergesCached(
        branches: string[],
        lastCommitCache: Map<string, number>
    ): Promise<Map<string, MergeInfo>> {

        const git = getSimpleGit();
        const result = new Map<string, MergeInfo>();
        const branchSet = new Set(branches);

        // 🔑 Single Git call
        const log = await git.raw([
            "log",
            "--all",
            "--merges",
            "--first-parent",
            "--pretty=format:%H|%P|%ci",
        ]);

        console.log('log :>>', log);


        for (const line of log.split("\n")) {
            if (!line.trim()) {
                continue;
            }

            const [mergeHash, parentsRaw, dateRaw] = line.split("|");
            const parents = parentsRaw.split(" ");

            // Need exactly 2 parents for a merge
            if (parents.length < 2) continue;

            const sourceCommit = parents[1]; // second parent

            const mergeDate = new Date(dateRaw).getTime();

            for (const target of branchSet) {
                if (this.isProtectedBranch(target)) {
                    continue;
                }

                const targetLastCommit = lastCommitCache.get(target);
                if (!targetLastCommit) {
                    continue;
                }

                // 🔑 Target must have commits AFTER the merge
                if (targetLastCommit <= mergeDate) {
                    continue
                }

                const existing = result.get(sourceCommit);

                // 🔑 Choose the most recently active target
                if (
                    !existing ||
                    targetLastCommit >
                    (lastCommitCache.get(existing.target) ?? 0)
                ) {
                    result.set(sourceCommit, {
                        hash: mergeHash,
                        mergeDate,
                        target,
                    });
                }
            }
        }

        return result;
    }

    isProtectedBranch(branch: string): boolean {
        return this.protectedBranchPatterns.some(r => r.test(branch));
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
            b => !this.isProtectedBranch(b)
        );

        LOGGER.debug(this, `${candidateBranches.length} candidate branches`);

        this.spinner.text = "Caching last commit dates...";
        await this.buildLastCommitCacheParallel(candidateBranches);


        console.log('branchToLastCommitDateCache :>>', this.branchToLastCommitDateCache);
        console.log('branchToLastCommitHashCache :>>', this.branchToLastCommitHashCache);

        this.spinner.text = "Building commit->branch map (in-memory)...";
        await this.buildCommitToBranchMap(candidateBranches);

        this.spinner.text = "Detecting direct merges (cached & parallel)...";
        const mergedMap = await this.getDirectMergesCached(
            candidateBranches,
            this.branchToLastCommitDateCache
        );

        console.log('mergedMap :>>', mergedMap);


        this.spinner.stop();
        LOGGER.debug(this, `Time taken: ${this.timer.stop("response")}`);

        if (mergedMap.size === 0) {
            LOGGER.log(this, "No merged branches found.");
            this.logTotalTime();
            return;
        }

        const items: ListItem<string>[] = [
            {
                label:
                    "Direkt gemergte Branches (relevantester Ziel-Branch, cached, geschützt ausgeschlossen)",
                type: "separator" as const,
            },
            ...[...mergedMap.entries()].map(([source, merge]) => ({
                key: source,
                label: `${chalk.blueBright(source)} → ${merge.target} (${dayjs(
                    this.branchToLastCommitDateCache.get(merge.target)
                ).fromNow()})`,
                type: "item" as const,
                value: source,
            })),
        ];

        const branchesToDelete = await withPromptExit(this, () =>
            renderCheckboxList({
                items,
                message: "Select the branches you want to delete:",
            })
        );

        this.logTotalTime();
        console.log("branchesToDelete:", branchesToDelete);
    }
}
