import { Command } from "@oclif/core";

import { ListItem, renderCheckboxList } from "../../ui/CheckboxList.js";
import { getSimpleGit } from "../../utils/getSimpleGit.js";


export default class WipListCommand extends Command {
    static description = "List all available WIP-Snapshots.";

    async run(): Promise<void> {
        const git = getSimpleGit()

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
