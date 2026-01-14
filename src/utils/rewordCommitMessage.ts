import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { getSimpleGit } from "./getSimpleGit.js";

/**
 * Reword an arbitrary commit in a Git repository non-interactively using 'git rebase -i'.
 *
 * Cross-platform (Windows/macOS/Linux): uses Node.js temp scripts instead of shell/sed.
 *
 * @param commitHash - The full commit hash you want to reword.
 * @param newMessage - The new commit message (string or string array).
 */
export async function rewordCommit(
    commitHash: string,
    newMessage: string | string[]
) {
    const git = getSimpleGit();

    const formattedMessage = Array.isArray(newMessage) ? newMessage.join("\n") : newMessage;
    const commitHashPrefix = commitHash.slice(0, 7);

    const rewordEditor = createTempScript(
        "reword-seq-editor",
        createRewordEditorScript(commitHashPrefix)
    );
    const messageEditor = createTempScript(
        "reword-msg-editor",
        createMessageEditorScript(formattedMessage)
    );

    // Use the currently running Node executable (works even if `node` isn't in PATH)
    const nodeExec = process.execPath;

    try {
        await git.raw([
            // Custom sequence editor: change 'pick' to 'reword' for the target commit
            "-c",
            `sequence.editor="${nodeExec}" "${rewordEditor}"`,
            // Custom core editor: write the new commit message without opening an editor
            "-c",
            `core.editor="${nodeExec}" "${messageEditor}"`,
            "rebase",
            "--autostash",
            "-i",
            `${commitHashPrefix}^`
        ]);
    } finally {
        // Clean up temporary files
        rmSync(rewordEditor, { force: true });
        rmSync(messageEditor, { force: true });
    }
}

/**
 * Creates a temporary Node.js script file with the given content.
 * @param prefix - Prefix for the temporary file name.
 * @param content - The JS script content.
 * @returns The path to the created temporary script file.
 */
function createTempScript(prefix: string, content: string): string {
    const scriptPath = join(tmpdir(), `${prefix}-${Date.now()}.js`);
    writeFileSync(scriptPath, content, { encoding: "utf8" });
    return scriptPath;
}

/**
 * Creates the Node script that replaces 'pick' with 'reword' in the rebase-todo file.
 * Git will call it like: node <script> <path-to-rebase-todo>
 *
 * @param commitHashPrefix - The 7-character prefix of the commit hash.
 * @returns The JS script content as a string.
 */
function createRewordEditorScript(commitHashPrefix: string): string {
    // Keep the script CommonJS for maximum compatibility when executed via node.
    return `
const fs = require("fs");

const file = process.argv[2];
if (!file) {
  console.error("No file argument provided to sequence editor.");
  process.exit(1);
}

const content = fs.readFileSync(file, "utf8").replace(new RegExp("^pick ${escapeForJsRegExp(commitHashPrefix)}", "m"), "reword ${commitHashPrefix}");

fs.writeFileSync(file, content, "utf8");
`;
}

/**
 * Creates the Node script that writes the new commit message into the file Git passes.
 * Git will call it like: node <script> <path-to-commit-msg-file>
 *
 * @param message - The new, formatted commit message.
 * @returns The JS script content as a string.
 */
function createMessageEditorScript(message: string): string {
    // Use JSON.stringify to safely embed the message as a JS string literal.
    const messageLiteral = JSON.stringify(message);
    return `
const fs = require("fs");

const file = process.argv[2];
if (!file) {
  console.error("No file argument provided to core editor.");
  process.exit(1);
}

fs.writeFileSync(file, ${messageLiteral}, "utf8");
`;
}

/**
 * Escapes a string for use inside a JS RegExp literal created via RegExp().
 * (Here it's mainly defensive; commit prefixes are hex, but it costs nothing.)
 */
function escapeForJsRegExp(input: string): string {
    return input.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}
