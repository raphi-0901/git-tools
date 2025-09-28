import {Args, Command} from "@oclif/core";
import { execSync } from 'node:child_process';
import { simpleGit } from "simple-git";

export default class Index extends Command {
    static args = {
        name: Args.string({
            description: "Jira issue ID to fetch",
            name: "issueId",
            required: true,
        }),
    };
    static description = "Automatically generate commit messages from staged files with feedback loop";

    async run(): Promise<void> {
        const { args } = await this.parse(Index);


        await this.saveWipSnapshot(args.name)

    }

    async saveWipSnapshot(snapshotName: string) {
        try {
            const git = simpleGit();

            // 1. Alle Änderungen (staged + unstaged + untracked) temporär zum Commit vorbereiten
            await git.add('./*'); // entspricht git add -A

            // 2. Commit erstellen, ohne HEAD zu verschieben (wir nutzen commit-tree)
            // Zuerst Baum-Objekt erstellen
            const treeHash = execSync('git write-tree').toString().trim();

            // Commit-Objekt erstellen, Parent ist HEAD
            const commitMessage = `WIP: ${snapshotName}`;
            const commitHash = execSync(`echo "${commitMessage}" | git commit-tree ${treeHash} -p HEAD`).toString().trim();

            // 3. Ref setzen: refs/wip/<branch>/<timestamp>
            const branchName = (await git.branchLocal()).current;
            const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '');
            const refName = `refs/wip/${branchName}/${timestamp}`;
            execSync(`git update-ref ${refName} ${commitHash}`);

            console.log(`WIP Snapshot gespeichert: ${refName} -> ${commitHash}`);
        } catch (error) {
            console.error('Fehler beim WIP-Snapshot:', error);
        }
    }
    }

