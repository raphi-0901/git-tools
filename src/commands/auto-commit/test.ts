import { Command } from "@oclif/core";
import { simpleGit } from "simple-git";

import { ListItem, renderCheckboxList } from "../../ui/CheckboxList.js";


export default class WipListCommand extends Command {
    static description = "List all available WIP-Snapshots.";

    async run(): Promise<void> {
        const git = simpleGit()

        const branches = await git.branchLocal()
        console.log(branches.all)

        const items = branches.all.map(
            (branch): ListItem<string> => ({
                key: branch,
                label: branch,
                type: "item",
                value: branch,
            })
        );

        await renderCheckboxList({
            items,
            message: "Select Branch:",
        })
    }
}
