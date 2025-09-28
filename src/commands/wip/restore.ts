import { checkbox } from "@inquirer/prompts";
import { Command } from "@oclif/core";
import {execSync} from "node:child_process";
import { simpleGit } from "simple-git";

export default class List extends Command {
    static description = "Liste alle Git-Branches und wähle interaktiv aus";

    async restoreWipSnapshot(refName: string, options: {
        autoBackup?: boolean;
    } = { autoBackup: true }) {
        try {
            const git = simpleGit();

            // 1. Prüfen, ob Working Directory sauber ist
            const status = await git.status();
            if (status.files.length > 0) {
                if (options.autoBackup) {
                    console.log('Ungesicherte Änderungen erkannt, erstelle temporären WIP-Snapshot...');
                    const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '');
                    const branchName = (await git.branchLocal()).current;
                    const tempRef = `refs/wip/${branchName}/autosave-${timestamp}`;
                    // Änderungen sichern
                    execSync('git add -A');
                    const treeHash = execSync('git write-tree').toString().trim();
                    const commitHash = execSync(`echo "Auto-WIP before restore" | git commit-tree ${treeHash} -p HEAD`).toString().trim();
                    execSync(`git update-ref ${tempRef} ${commitHash}`);
                    console.log(`Temporärer Snapshot erstellt: ${tempRef}`);
                } else {
                    throw new Error('Working Directory ist nicht sauber. Bitte Änderungen sichern oder autoBackup aktivieren.');
                }
            }

            // 2. Snapshot wiederherstellen (nur Working Directory, HEAD bleibt)
            execSync(`git checkout ${refName} -- .`);
            console.log(`WIP Snapshot ${refName} erfolgreich wiederhergestellt.`);

        } catch (error) {
            console.error('Fehler beim Wiederherstellen des WIP-Snapshots:', error);
        }
    }

    async run(): Promise<void> {
        await this.restoreWipSnapshot('refs/wip/main/2024-01-01T12:00:00Z')

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
