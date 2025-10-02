import { search } from "@inquirer/prompts";
import {Args, Command} from "@oclif/core";
import {execSync} from "node:child_process";
import { simpleGit } from "simple-git";

import {retrieveWIPSnapshots} from "../../utils/retrieve-wip-snapshots.js";

export default class List extends Command {
    static args = {
        idOrRef: Args.string({
            description: "ID or ref of the WIP snapshot to restore. If not provided, a list of all snapshots will be shown.",
            name: "idOrRef",
            required: false,
        }),
    };
    static description = "Restore a WIP snapshot.";

    async getRefName(idOrRef: string | undefined): Promise<string> {
        const wipSnapshots = retrieveWIPSnapshots()

        if(idOrRef === undefined) {
            return search({
                message: 'Select a WIP Snapshot to restore:',
                source(input) {
                    if (!input) {
                        return wipSnapshots.map((snapshot) => ({description: snapshot.message, value: snapshot.ref}));
                    }

                    const data = wipSnapshots.filter((snapshot) => snapshot.id.toString().includes(input) || snapshot.ref.includes(input));

                    return data.map((snapshot) => ({description: snapshot.message, value: snapshot.ref}));
                },
            });
        }

        if(Number.isNaN(Number(idOrRef))) {
            return wipSnapshots.find((snapshot) => snapshot.ref === idOrRef)?.ref ?? idOrRef
        }

        return wipSnapshots.find((snapshot) => snapshot.id === Number(idOrRef))?.ref ?? idOrRef
    }

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
        const {args} = await this.parse(List);
        const ref = await this.getRefName(args.idOrRef)

        console.log('ref :>>', ref);

        // show list if no argument is passed
        // if argument is number -> check for id, otherwise check for name
        await this.restoreWipSnapshot(ref)
    }
}
