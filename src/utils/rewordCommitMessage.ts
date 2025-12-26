import { rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { getSimpleGit } from './getSimpleGit.js'

/**
 * Reword an arbitrary commit in a Git repository non-interactively using 'git rebase -i'.
 *
 * @param commitHash - The full commit hash you want to reword.
 * @param newMessage - The new commit message (string or string array).
 */
export async function rewordCommit(
    commitHash: string,
    newMessage: string | string[]
) {
    const git = getSimpleGit()

    const formattedMessage = Array.isArray(newMessage) ? newMessage.join('\n') : newMessage
    const commitHashPrefix = commitHash.slice(0, 7)

    const rewordEditor = createTempScript(
        'reword-seq-editor',
        createRewordEditorScript(commitHashPrefix)
    )
    const messageEditor = createTempScript(
        'reword-msg-editor',
        createMessageEditorScript(formattedMessage)
    )

    try {
        await git.raw([
            // Set custom sequence editor to change 'pick' to 'reword'
            '-c', `sequence.editor=${rewordEditor}`,
            // Set custom core editor to auto-write the new commit message
            '-c', `core.editor=${messageEditor}`,
            'rebase',
            '--autostash',
            '-i',
            `${commitHashPrefix}^`
        ])
    } finally {
        // Cleanup temporary files
        rmSync(rewordEditor, {
 force: true 
})
        rmSync(messageEditor, {
 force: true 
})
    }
}

/**
 * Creates a temporary shell script file with the given content and makes it executable.
 * @param prefix - Prefix for the temporary file name.
 * @param content - The shell script content.
 * @returns The path to the created temporary script file.
 */
function createTempScript(prefix: string, content: string): string {
    const scriptPath = join(tmpdir(), `${prefix}-${Date.now()}.sh`)
    // Write content and set executable permission (0o755)
    writeFileSync(scriptPath, content, {
 mode: 0o755 
})
    return scriptPath
}

/**
 * Creates the script that replaces 'pick' with 'reword' in the rebase-todo file.
 * @param commitHashPrefix - The 7-character prefix of the commit hash.
 * @returns The shell script content as a string.
 */
function createRewordEditorScript(commitHashPrefix: string): string {
    return `#!/bin/sh
# Replace 'pick commitHash' with 'reword commitHash' for the target commit in the rebase-todo file ($1)
sed "s/^pick ${commitHashPrefix}/reword ${commitHashPrefix}/" "$1" > "$1.tmp"
mv "$1.tmp" "$1"
`
}

/**
 * Creates the script that automatically writes the new commit message.
 * @param message - The new, formatted commit message.
 * @returns The shell script content as a string.
 */
function createMessageEditorScript(message: string): string {
    // Use printf to safely write the message, escaping inner double quotes for the shell command
    const safeMessage = message.replaceAll('"', String.raw`\"`)
    return `#!/bin/sh
# Write the new commit message into the file Git passes ($1)
printf "%s" "${safeMessage}" > "$1"
`
}
