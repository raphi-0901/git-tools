import {Command} from "@oclif/core";
import chalk from "chalk";
import {execSync} from "node:child_process";

import {WIPSnapshot} from "../types/wip-snapshot.js";

export function deleteWipSnapshots(ctx: Command, refs: string[]): void {
    try {
        for (const ref of refs) {
            execSync(`git update-ref -d ${ref}`);
            ctx.log(`✅ Deleted snapshot ${chalk.green(ref)}`);
        }
    } catch (error) {
        ctx.error("Error while deleting WIP-snapshots: " + error);
    }
}
