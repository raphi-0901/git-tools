import {Args, Command, Flags} from "@oclif/core";
import {execSync} from 'node:child_process';
import {ResetMode, simpleGit} from "simple-git";

export default class Index extends Command {
    static args = {
        name: Args.string({
            description: "Message for identifying the WIP snapshot. Default: WIP Snapshot",
            name: "message",
            required: false,
        }),
    };
    static description = "Creates an WIP snapshot of the current branch and saves it as a ref. Optionally nukes the working tree after creating the snapshot.";
    static flags = {
        nukeWorkingTree: Flags.string({
            char: "f",
            description: "Nukes the working tree after creating the snapshot.",
        }),
    };

    getNowAsString(): string {
        const now = new Date();
        return `${now.getFullYear()}-${this.pad(now.getMonth() + 1)}-${this.pad(now.getDate())}_${this.pad(now.getHours())}-${this.pad(now.getMinutes())}-${this.pad(now.getSeconds())}`;
    }

    pad(n: number) {
        return n.toString().padStart(2, '0');
    }

    async run(): Promise<void> {
        const {args, flags} = await this.parse(Index);
        const snapshotName = args.name ?? "WIP Snapshot";

        await this.saveWipSnapshot(snapshotName, Boolean(flags.nukeWorkingTree))
    }

    async saveWipSnapshot(snapshotName: string, nukeWorkingTree: boolean) {
        try {
            const git = simpleGit();
            await git.add('.');

            const treeHash = execSync('git write-tree').toString().trim();
            const commitHash = execSync(`echo "${snapshotName}" | git commit-tree ${treeHash} -p HEAD`).toString().trim();

            const branchName = (await git.branchLocal()).current;
            const refName = `refs/wip/${branchName}/${this.getNowAsString()}`;
            execSync(`git update-ref ${refName} ${commitHash}`);

            console.log(`WIP Snapshot gespeichert: ${refName} -> ${commitHash}`);

            if (nukeWorkingTree) {
                await git.reset(ResetMode.HARD);
                await git.clean('f', ['-d']);
            }
        } catch (error) {
            console.error('Fehler beim WIP-Snapshot:', error);
        }
    }
}

