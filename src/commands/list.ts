import { checkbox } from "@inquirer/prompts";
import { Command } from "@oclif/core";
import { simpleGit } from "simple-git";

export default class List extends Command {
    static description = "Liste alle Git-Branches und wähle interaktiv aus";

    async run(): Promise<void> {
        const git = simpleGit();
        const branches = await git.branchLocal();
        const branchNames = branches.all;

        if (branchNames.length === 0) {
            this.log("❌ Keine Branches gefunden.");
            return;
        }

        const selectedBranches = await checkbox({
            choices: branchNames,
            message: 'Select a package manager',
        });

        this.log("✅ Ausgewählt:", selectedBranches.join(", "));
    }
}
