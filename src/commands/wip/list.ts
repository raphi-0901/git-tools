import { Command } from "@oclif/core";

import {retrieveWIPSnapshots} from "../../utils/retrieve-wip-snapshots.js";

export default class List extends Command {
    static description = "List all available WIP-Snapshots.";

    async run(): Promise<void> {
        try {
            const wipSnapshots = retrieveWIPSnapshots()

            console.log('WIP-Snapshots:');
            for (const [index, snapshot] of wipSnapshots.entries()) {
                console.log(`${snapshot.id}. Ref: ${snapshot.ref}`);
                console.log(`   Commit: ${snapshot.hash}`);
                console.log(`   Message: ${snapshot.message}`);

                if(index < wipSnapshots.length - 1) {
                    console.log();
                }
            }
        } catch (error) {
            this.error('Error while listing WIP snapshots:' + error)
        }
    }
}
