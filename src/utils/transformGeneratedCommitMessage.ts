/**
 * Splits a generated commit message into its first line and the remaining body.
 *
 * - If the commit message contains a line break, returns `[firstLine, restOfMessage]`.
 * - If there is no line break, returns `[commitMessage]` with only one element.
 *
 * @param commitMessage The full commit message to transform.
 * @returns A tuple containing either:
 *          - `[firstLine, restOfMessage]` if a line break exists, or
 *          - `[commitMessage]` if there is no line break.
 */
export function transformGeneratedCommitMessage(commitMessage: string): [string, string] | [string] {
    const indexOfLineBreak = commitMessage.indexOf("\n");
    if (indexOfLineBreak === -1) {
        return [commitMessage];
    }

    const firstLine = commitMessage.slice(0, indexOfLineBreak).trim();
    const rest = commitMessage.slice(indexOfLineBreak + 1).trim();

    return [firstLine, rest]
}
