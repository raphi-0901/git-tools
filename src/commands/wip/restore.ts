import { search } from "@inquirer/prompts";
import { Args, Command } from "@oclif/core";
import chalk from "chalk";
import { execSync } from "node:child_process";
import { simpleGit } from "simple-git";

import { generateSnapshotName } from "../../utils/generate-snapshot-name.js";
import { retrieveWIPSnapshots } from "../../utils/retrieve-wip-snapshots.js";

export default class List extends Command {
    static args = {
        idOrRef: Args.string({
            description: "ID or ref of the WIP-snapshot to restore. If not provided, a list of all snapshots will be shown.",
            name: "idOrRef",
            required: false,
        }),
    };
    static description = "Restore a WIP-snapshot.";
    static examples = [
        {
            command: '<%= config.bin %> <%= command.id %>',
            description: "Restore a snapshot by selecting from the interactive list",
        },
        {
            command: '<%= config.bin %> <%= command.id %> 3',
            description: "Restore a snapshot by its ID",
        },
        {
            command: '<%= config.bin %> <%= command.id %> refs/wip/my-branch-123456',
            description: "Restore a snapshot by its ref",
        }
    ];

    async getRefName(idOrRef: string | undefined): Promise<string> {
        const wipSnapshots = retrieveWIPSnapshots();

        if (idOrRef === undefined) {
            return search({
                message: chalk.yellow('Select a WIP-Snapshot to restore:'),
                source(input) {
                    if (!input) {
                        return wipSnapshots.map((snapshot) => ({
                            description: snapshot.message,
                            value: snapshot.ref
                        }));
                    }

                    const data = wipSnapshots.filter((snapshot) =>
                        snapshot.id.toString().includes(input) ||
                        snapshot.ref.toLowerCase().includes(input.toLowerCase()) ||
                        snapshot.message.toLowerCase().includes(input.toLowerCase())
                    );

                    return data.map((snapshot) => ({
                        description: snapshot.message,
                        value: snapshot.ref
                    }));
                },
            });
        }

        if (Number.isNaN(Number(idOrRef))) {
            return wipSnapshots.find((snapshot) => snapshot.ref === idOrRef)?.ref ?? idOrRef;
        }

        return wipSnapshots.find((snapshot) => snapshot.id === Number(idOrRef))?.ref ?? idOrRef;
    }

    async restoreWipSnapshot(refName: string) {
        try {
            const git = simpleGit();
            const status = await git.status();

            if (status.files.length > 0) {
                this.log(chalk.yellow('⚠️ Unsaved changes detected. Creating temp WIP-Snapshot...'));
                const branchName = (await git.branchLocal()).current;
                const tempRef = generateSnapshotName(branchName, true);

                execSync('git add -A');
                const treeHash = execSync('git write-tree').toString().trim();
                const commitHash = execSync(`echo "Auto-WIP before restore" | git commit-tree ${treeHash} -p HEAD`).toString().trim();
                execSync(`git update-ref ${tempRef} ${commitHash}`);
                this.log(chalk.green('✅ Created temp WIP-Snapshot.'));
            }

            execSync(`git checkout ${refName} -- .`);
            this.log(chalk.green(`✅ WIP-Snapshot ${chalk.cyan(refName)} successfully restored.`));
        } catch (error) {
            this.error(chalk.red(`❌ Error while restoring WIP-Snapshot: ${error}`));
        }
    }

    async run(): Promise<void> {
        const { args } = await this.parse(List);
        const ref = await this.getRefName(args.idOrRef);
        await this.restoreWipSnapshot(ref);
    }
}
