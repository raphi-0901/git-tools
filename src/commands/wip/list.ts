import { checkbox } from "@inquirer/prompts";
import { Command } from "@oclif/core";
import {execSync} from "node:child_process";
import { simpleGit } from "simple-git";

export default class List extends Command {
    static description = "Liste alle Git-Branches und wähle interaktiv aus";

    async listWipSnapshots() {
        try {
            // Alle refs unter refs/wip/** auslesen
            const refsOutput = execSync('git for-each-ref --format="%(refname) %(objectname) %(committerdate:iso) %(subject)" refs/wip/').toString();

            if (!refsOutput.trim()) {
                console.log('Keine WIP-Snapshots gefunden.');
                return;
            }

            // Zeilen splitten
            const lines = refsOutput.trim().split('\n');

            console.log('WIP-Snapshots:');
            for (const [index, line] of lines.entries()) {
                const [ref, commitHash, date, ...subjectParts] = line.split(' ');
                const subject = subjectParts.join(' ');
                console.log(`${index + 1}. Ref: ${ref}`);
                console.log(`   Commit: ${commitHash}`);
                console.log(`   Datum: ${date}`);
                console.log(`   Message: ${subject}`);
            }

        } catch (error) {
            console.error('Fehler beim Auflisten der WIP-Snapshots:', error);
        }
    }

    async run(): Promise<void> {
        // const git = simpleGit();
        // const branches = await git.branchLocal();
        // const branchNames = branches.all;
        //
        // if (branchNames.length === 0) {
        //     this.log("❌ Keine Branches gefunden.");
        //     return;
        // }
        //
        // const selectedBranches = await checkbox({
        //     choices: branchNames,
        //     message: 'Select a package manager',
        // });
        //
        // this.log("✅ Ausgewählt:", selectedBranches.join(", "));
        await this.listWipSnapshots()
    }
}
