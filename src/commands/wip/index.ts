import {Args, Command, Flags} from "@oclif/core";
import {execSync} from 'node:child_process';
import {ResetMode, simpleGit} from "simple-git";

import {generateSnapshotName} from "../../utils/generate-snapshot-name.js";

export default class Index extends Command {
    static args = {
        name: Args.string({
            description: "Message for identifying the WIP-snapshot. Default: WIP-Snapshot",
            name: "message",
            required: false,
        }),
    };
    static description = "Creates an WIP-snapshot of the current branch and saves it as a ref. Optionally nukes the working tree after creating the snapshot.";
    static flags = {
        nukeWorkingTree: Flags.boolean({
            char: "f",
            default: false,
            description: "Nukes the working tree after creating the snapshot.",
        }),
    };

    async run(): Promise<void> {
        const {args, flags} = await this.parse(Index);
        const snapshotName = args.name ?? "WIP-Snapshot";

        await this.saveWipSnapshot(snapshotName, flags.nukeWorkingTree)
    }

    async saveWipSnapshot(snapshotName: string, nukeWorkingTree: boolean) {
        try {
            const git = simpleGit();
            await git.add('.');

            const treeHash = execSync('git write-tree').toString().trim();
            const commitHash = execSync(`echo "${snapshotName}" | git commit-tree ${treeHash} -p HEAD`).toString().trim();

            const branchName = (await git.branchLocal()).current;
            const refName = generateSnapshotName(branchName);
            execSync(`git update-ref ${refName} ${commitHash}`);

            this.log(`WIP-Snapshot saved: ${refName} -> ${commitHash}`);

            if (nukeWorkingTree) {
                await git.reset(ResetMode.HARD);
                await git.clean('f', ['-d']);
            }
        } catch (error) {
            this.error(`Error while creating WIP-Snapshot: ${error}`);
        }
    }
}

