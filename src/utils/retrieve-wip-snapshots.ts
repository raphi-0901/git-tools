import {execSync} from "node:child_process";

import {WipSnapshot} from "../types/wip-snapshot.js";

export function retrieveWIPSnapshots (): WipSnapshot[] {
    try {
        // read all refs under refs/wip/**
        const refsOutput = execSync('git for-each-ref --format="%(refname) %(objectname) %(subject)" refs/wip/').toString();

        if (!refsOutput.trim()) {
            console.log('No WIP snapshots found.');

            return []
        }

        const lines = refsOutput.trim().split('\n');
        return lines.map((line, index) => {
            const [ref, commitHash, ...subjectParts] = line.split(" ");
            const subject = subjectParts.join(" ");

            return {
                hash: commitHash,
                id: index + 1,
                message: subject,
                ref,
            };
        });
    } catch {
        console.error("Error while retrieving WIP snapshots:")

        return []
    }
}
