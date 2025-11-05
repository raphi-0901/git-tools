import { execSync } from "node:child_process";

import { WIPSnapshot } from "../types/wip-snapshot.js";

export function retrieveWIPSnapshots(): WIPSnapshot[] {
    // read all refs under refs/wip/**
    const refsOutput = execSync('git for-each-ref --format="%(refname) %(objectname) %(subject)" refs/wip/').toString();

    if (!refsOutput.trim()) {
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
}
