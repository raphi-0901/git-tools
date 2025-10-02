import { checkbox, confirm } from "@inquirer/prompts";
import { Command, Flags } from "@oclif/core";
import chalk from "chalk";

import { deleteWipSnapshots } from "../../utils/delete-wip-snapshots.js";
import { retrieveWIPSnapshots } from "../../utils/retrieve-wip-snapshots.js";

export default class Delete extends Command {
    static description = "Delete one or more WIP-Snapshots interactively.";
static examples = [
        "$ mycli delete",
        "$ mycli delete --all",
    ];
    static flags = {
        all: Flags.boolean({
            default: false,
            description: "Delete all WIP-Snapshots without prompting for selection.",
        }),
    };

    async run(): Promise<void> {
        try {
            const { flags } = await this.parse(Delete);
            const wipSnapshots = retrieveWIPSnapshots(this);

            if (wipSnapshots.length === 0) {
                this.log(chalk.yellow("⚠️  No WIP-Snapshots found."));
                return;
            }

            if (flags.all) {
                const proceed = await confirm({
                    default: false,
                    message: `Are you sure you want to delete all ${wipSnapshots.length} WIP-Snapshots?`,
                });

                if (!proceed) {
                    this.log(chalk.cyan("❎ Aborted. No snapshots deleted."));
                    return;
                }

                const allRefs = wipSnapshots.map((s) => s.ref);
                deleteWipSnapshots(this, allRefs);
                this.log(chalk.green(`✅ Deleted all ${allRefs.length} WIP-Snapshots.`));
                return;
            }

            this.log(chalk.cyan.bold("\n📸 Select snapshots to delete:\n"));

            const choices = wipSnapshots.map((snapshot) => ({
                name: `${chalk.blueBright(snapshot.id.toString())} | ${chalk.green(snapshot.ref)} | ${chalk.magenta(snapshot.hash.slice(0, 7))} | ${snapshot.message}`,
                short: snapshot.ref,
                value: snapshot.ref,
            }));

            const snapshotsToDelete = await checkbox({
                choices,
                loop: false,
                message: "Select the snapshots you want to delete:",
                pageSize: 10,
            });

            if (!snapshotsToDelete || snapshotsToDelete.length === 0) {
                this.log(chalk.cyan("❎ No snapshots selected. Nothing deleted."));
                return;
            }

            deleteWipSnapshots(this, snapshotsToDelete);
        } catch (error) {
            this.error(chalk.red(`❌ Error while deleting WIP-snapshots: ${error}`));
        }
    }
}
