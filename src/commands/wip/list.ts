import { Command } from "@oclif/core";
import chalk from "chalk";
import Table from "cli-table3";

import { retrieveWIPSnapshots } from "../../utils/retrieve-wip-snapshots.js";

export default class List extends Command {
    static description = "List all available WIP-Snapshots.";

    async run(): Promise<void> {
        try {
            const wipSnapshots = retrieveWIPSnapshots(this);

            if (wipSnapshots.length === 0) {
                this.log(chalk.yellow("⚠️  No WIP-Snapshots found."));
                return;
            }

            this.log(chalk.cyan.bold("📸 Available WIP-Snapshots:\n"));

            const table = new Table({
                head: [
                    chalk.blueBright("ID"),
                    chalk.green("Ref"),
                    chalk.magenta("Commit"),
                    chalk.white("Message"),
                ],
                style: {
                    border: [],
                    head: [],
                },
            });

            for (const snapshot of wipSnapshots) {
                table.push([
                    chalk.blueBright(snapshot.id.toString()),
                    chalk.green(snapshot.ref),
                    chalk.magenta(snapshot.hash),
                    snapshot.message,
                ]);
            }

            this.log(table.toString());
        } catch (error) {
            this.error(chalk.red(`❌ Error while listing WIP-snapshots: ${error}`));
        }
    }
}
