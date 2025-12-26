export function transformGeneratedCommitMessage(commitMessage: string): [string, string] | [string] {
    const indexOfLineBreak = commitMessage.indexOf('\n')
    if (indexOfLineBreak === -1) {
        return [commitMessage]
    }

    const firstLine = commitMessage.slice(0, indexOfLineBreak).trim()
    const rest = commitMessage.slice(indexOfLineBreak + 1).trim()

    return [firstLine, rest]
}
