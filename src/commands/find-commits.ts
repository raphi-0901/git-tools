import { Flags } from "@oclif/core";
import chalk from "chalk";
import { DiffResult, simpleGit } from "simple-git";

import { BaseCommand } from "../base-commands/BaseCommand.js";
import { checkIfInGitRepository } from "../utils/checkIfInGitRepository.js";

// 1. Define the argument structure for the evaluators
type EvaluationArgs = {
    message: string;
    stats: DiffResult;
};

const SIZE_FUNCTIONS = {
    large(stats: DiffResult) {
        if(stats.changed < 5) {
            return false;
        }

        const totalChanges = stats.insertions + stats.deletions;

        return totalChanges > 800;
    },
    medium(stats: DiffResult) {
        if(stats.changed < 2 || stats.changed > 5) {
            return false;
        }

        const totalChanges = stats.insertions + stats.deletions;

        return totalChanges > 100 && totalChanges < 500;
    },
    'one-line'(stats: DiffResult) {
        return stats.insertions === 1 && stats.deletions === 1;
    },
    small(stats: DiffResult) {
        if(stats.changed > 1) {
            return false;
        }

        const totalChanges = stats.insertions + stats.deletions;

        return totalChanges < 100;
    },
}

// 2. Define the map outside the class to allow for clean Type extraction
const EVALUATORS = {
    'docs-only'({ message, stats }: EvaluationArgs) {
        if (!message.includes("docs")) {
            return false;
        }

        return SIZE_FUNCTIONS.medium(stats);
    },
    'large-feature'({ message, stats }: EvaluationArgs) {
        if (!message.includes("feat")) {
            return false;
        }

        return SIZE_FUNCTIONS.large(stats);
    },
    'large-fix'({ message, stats }: EvaluationArgs) {
        if (!message.includes("fix")) {
            return false;
        }

        return SIZE_FUNCTIONS.large(stats);
    },
    'large-refactor'({ message, stats }: EvaluationArgs) {
        if (!message.includes("refactor")) {
            return false;
        }

        return SIZE_FUNCTIONS.large(stats);
    },
    'medium-feature'({ message, stats }: EvaluationArgs) {
        if (!message.includes("feat")) {
            return false;
        }

        return SIZE_FUNCTIONS.medium(stats);
    },
    'medium-fix'({ message, stats }: EvaluationArgs) {
        if (!message.includes("fix")) {
            return false;
        }

        return SIZE_FUNCTIONS.medium(stats);
    },
    'medium-refactor'({ message, stats }: EvaluationArgs) {
        if (!message.includes("refactor")) {
            return false;
        }

        return SIZE_FUNCTIONS.medium(stats);
    },
    'oneline-fix'({ message, stats }: EvaluationArgs) {
        if (!message.includes("fix")) {
            return false;
        }

        return SIZE_FUNCTIONS['one-line'](stats);
    },
    'small-feature'({ message, stats }: EvaluationArgs) {
        if (!message.includes("feat")) {
            return false;
        }

        return SIZE_FUNCTIONS.small(stats);
    },
    'small-fix'({ message, stats }: EvaluationArgs) {
        if (!message.includes("fix")) {
            return false;
        }

        return SIZE_FUNCTIONS.small(stats);
    },
    'small-refactor'({ message, stats }: EvaluationArgs) {
        if (!message.includes("refactor")) {
            return false;
        }

        return SIZE_FUNCTIONS.small(stats);
    },
    'test-only'({ message, stats }: EvaluationArgs) {
        if (!message.includes("test")) {
            return false;
        }

        return SIZE_FUNCTIONS.medium(stats);
    },
} as const;

// 3. Extract the literal union type ("oneline-fix" | "refactor" | "small-feature")
type EvaluationType = keyof typeof EVALUATORS;

export default class FindCommitsCommand extends BaseCommand<typeof FindCommitsCommand> {
    static description = "Filters commits based on type and change size (e.g., small feats or one-line fixes)";
    static readonly EVALUATION_MAP = EVALUATORS;
    static flags = {
        mode: Flags.string({
            description: "Filter by commit type (Conventional Commits style)",
            // Cast the keys to the specific EvaluationType array
            options: Object.keys(EVALUATORS) as EvaluationType[],
            required: true,
        }),
    };
    public configId = "find-commits" as const;

    async run() {
        const { flags } = await this.parse(FindCommitsCommand);
        await checkIfInGitRepository(this);

        const git = simpleGit();
        this.spinner.start("Finding commits...");

        // flags.mode is now strictly typed as EvaluationType
        const mode = flags.mode as EvaluationType;

        // Fetch logs with shortstat to populate the 'diff' property
        const log = await git.log([
            '--shortstat',
            '--no-merges',
        ]);

        const filteredCommits = log.all.filter(commit => {
            const stats = commit.diff;
            if (!stats) {
                return false;
            }

            // Execute the specific evaluator based on the flag
            const evaluator = FindCommitsCommand.EVALUATION_MAP[mode];
            return evaluator({ message: commit.message, stats });
        });

        this.spinner.stop();

        if (filteredCommits.length === 0) {
            this.log(chalk.yellow("No commits found matching those constraints."));
            return;
        }

        this.log(chalk.green(`\nFound ${filteredCommits.length} matching commits:\n`));

        for (const commit of filteredCommits) {
            this.log(
                chalk.cyan(commit.hash.slice(0, 7)) +
                " " +
                chalk.white(commit.message)
            );

            if (commit.diff) {
                const totalChanges = commit.diff.insertions + commit.diff.deletions;
                this.log(
                    chalk.gray(
                        `  Files: ${commit.diff.changed}, ` +
                        `Changes: ${totalChanges} (+${commit.diff.insertions} / -${commit.diff.deletions})`
                    )
                );
            }

            this.log(chalk.dim("---"));
        }
    }
}
