import chalk from "chalk";
import { simpleGit } from "simple-git";

import { BaseCommand } from "../base-commands/BaseCommand.js";
import { checkIfInGitRepository } from "../utils/checkIfInGitRepository.js";

export default class FindBinaryCommitsCommand extends BaseCommand<
    typeof FindBinaryCommitsCommand
> {
    static description = "Finds commits that contain binary file changes";
    public configId = "find-binary-commits" as const;

    async run() {
        await checkIfInGitRepository(this);

        const git = simpleGit();
        this.spinner.start("Scanning commits for binary changes...");

        // Get commit hashes only (fast)
        const log = await git.log([
            "--no-merges",
            "--pretty=format:%H",
        ]);

        const binaryCommits: {
            files: string[];
            hash: string;
            message: string;
        }[] = [];

        const hashes = log.all[0].hash.split("\n");

        for (const hash of hashes) {
            const output = await git.show([
                hash,
                "--numstat",
                "--format=%s",
            ]);

            const lines = output.split("\n");

            const message = lines.shift() ?? "";
            const binaryFiles: string[] = [];

            for (const line of lines) {
                const [insertions, deletions, file] = line.split("\t");

                if (insertions === "-" && deletions === "-" && file) {
                    binaryFiles.push(file);
                }
            }

            if (binaryFiles.length > 0) {
                binaryCommits.push({
                    files: binaryFiles,
                    hash,
                    message,
                });
            }
        }

        this.spinner.stop();

        if (binaryCommits.length === 0) {
            this.log(chalk.yellow("No commits with binary changes found."));
            return;
        }

        this.log(
            chalk.green(
                `\nFound ${binaryCommits.length} commits with binary changes:\n`
            )
        );

        for (const commit of binaryCommits) {
            this.log(
                chalk.cyan(commit.hash.slice(0, 7)) +
                " " +
                chalk.white(commit.message)
            );

            for (const file of commit.files) {
                this.log(chalk.gray(`  • ${file}`));
            }

            this.log(chalk.dim("---"));
        }
    }
}
