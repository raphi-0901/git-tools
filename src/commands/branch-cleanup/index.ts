import { checkbox } from "@inquirer/prompts";
import { Flags } from "@oclif/core";
import chalk from "chalk";
import dayjs from "dayjs";
import relativeTime from 'dayjs/plugin/relativeTime.js'
import { simpleGit } from "simple-git";

import { BaseCommand } from "../../base-commands/BaseCommand.js";
import * as LOGGER from "../../utils/logging.js";
import { createSpinner } from "../../utils/spinner.js";

dayjs.extend(relativeTime)

type MergeInfo = { date: string; hash: string; target: string; };

export default class BranchCleanupCommand extends BaseCommand {
    static flags = {
        debug: Flags.boolean({
            description: "Show debug logs.",
        }),
    };
    public readonly commandId = "branch-cleanup";
    public readonly configId = "branch-cleanup"

    async catch(error: unknown) {
        super.catch(error)
        this.log(chalk.red("🚫 Branch cleanup cancelled."));
    }

    logTotalTime() {
        LOGGER.debug(this, `Action took ${this.timer.stop("total")}.`)
    }

    async run() {
        await this.parse(BranchCleanupCommand);
        this.timer.start("total")
        this.timer.start("response")
        const git = simpleGit();
        this.spinner.start();
        this.spinner.text = "Fetching repository..."

        await git.fetch()

        this.spinner.text = "Loading branches..."

        const allBranches = await git.branchLocal();
        LOGGER.debug(this, `${allBranches.all.length} branches found`)

        // Step 1: find all merged branches
        const mergedBranches = new Set<string>();
        for (const target of allBranches.all) {
            const result = await git.branch(["--merged", target]);

            for (const merged of result.all) {
                if (merged !== target) {
                    mergedBranches.add(merged);
                }
            }
        }

        LOGGER.debug(this, `${mergedBranches.size} merged branches found`)
        LOGGER.debug(this, `Merged branches: ${JSON.stringify(mergedBranches.entries().toArray(), null, 2)}`)

        // console.log(chalk.blue("\nMerged branches (anywhere):"));
        // for (const b of mergedBranches) {
        //     console.log(" -", b);
        // }

        // Step 2: build mapping source -> targets
        const mergedMap = new Map<string, Map<string, MergeInfo>>();

        for (const target of allBranches.all) {
            const log = await git.log([
                target,
                "--merges",
                "--first-parent",
                "--pretty=format:%H|%ci|%s",
            ]);

            for (const line of log.all.flatMap(l => l.hash.split("\n"))) {
                const [hash, date, subject] = line.split("|");

                const match = subject.match(/Merge branch '([^']+)' into '([^']+)'/);
                if (!match) {
                    continue
                }

                const source = match[1];
                const actualTarget = match[2];

                if (!mergedBranches.has(source)) {
                    continue
                }

                if (!mergedMap.has(source)) {
                    mergedMap.set(source, new Map());
                }

                mergedMap.get(source)!.set(hash, { date, hash, target: actualTarget });
            }
        }

        // Step 3: find stale branches up-to-date with remote
        const now = Date.now();
        const cutoff = now - 30 * 24 * 60 * 60 * 1000; // 30 days in ms
        const staleBranches: { branch: string; date: string }[] = [];

        for (const branch of allBranches.all) {
            try {
                const upstream = await git.raw(["rev-parse", "--abbrev-ref", `${branch}@{u}`]);
                if (!upstream) {
                    continue;
                }

                const [aheadRaw, behindRaw] = await Promise.all([
                    git.raw(["rev-list", "--count", `${branch}@{u}..${branch}`]),
                    git.raw(["rev-list", "--count", `${branch}..${branch}@{u}`]),
                ]);

                const ahead = Number.parseInt(aheadRaw.trim(), 10);
                const behind = Number.parseInt(behindRaw.trim(), 10);

                // they have diverged, skip
                // TODO: maybe we should also delete the branch if the upstream has more commits?
                if (ahead !== 0 || behind !== 0) {
                    continue;
                }

                const log = await git.log([branch, "-n", "1"]);
                if (!log.latest) {
                    continue;
                }

                const commitDate = new Date(log.latest.date).getTime();
                if (commitDate < cutoff) {
                    staleBranches.push({ branch, date: log.latest.date });
                }
            } catch{
                // the branch might not have upstream
            }
        }

        // Step 4: interactive selection
        const choices = [
            ...[...mergedMap.entries()].map(([source, merges]) => ({
                name: `${chalk.blueBright(source)} | Merged into: ${[...new Set([...merges.values()].map(m => m.target))].join(", ")}`,
                short: source,
                value: source,
            })),
            ...staleBranches.map(sb => ({
                name: `${chalk.yellowBright(sb.branch)} | Last commit: ${dayjs(sb.date).fromNow()}`,
                short: sb.branch,
                value: sb.branch,
            })),
        ];

        this.spinner.stop();
        LOGGER.debug(this, `Time taken: ${this.timer.stop("response")}`)

        if(choices.length === 0) {
            LOGGER.log(this, "No branches to delete.")
            this.logTotalTime()
            return;
        }

        const branchesToDelete = await checkbox({
            choices,
            loop: false,
            message: "Select the branches you want to delete:",
            pageSize: choices.length,
        });

        this.logTotalTime()
        console.log("branchesToDelete :>>", branchesToDelete, branchesToDelete.length);
    }
}
