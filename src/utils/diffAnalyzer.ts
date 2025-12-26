import { getSimpleGit } from './getSimpleGit.js'
import { decode, encode, isWithinTokenLimit } from './gptTokenizer.js'

async function diffFilesPerType(params: DiffAnalyzerParams) {
    const git = getSimpleGit()
    const isStaged = params.type === 'commit'
    const baseArgs = isStaged
        ? ['diff', '--cached']
        : ['show', params.commitHash]

    // Get both name-status AND full diff in parallel
    const [nameStatus, fullDiff] = await Promise.all([
        git.raw([...baseArgs, '--name-status', '--pretty=format:']),
        git.raw([
            ...baseArgs,
            '--pretty=format:',
            '-w',
            '--ignore-blank-lines',
        ]),
    ])

    const nonRemovedFilesToStatusMap = new Map<string, string>()
    const deletedFiles = new Set<string>()

    for (const line of nameStatus.split('\n').filter(Boolean)) {
        const match = line.trim().match(/^(\S+)\s+(.+)$/)
        if (!match) {
            continue
        }

        const [, status, name] = match

        if (status === 'D') {
            deletedFiles.add(name)
        } else {
            nonRemovedFilesToStatusMap.set(name, status)
        }
    }

    if (nonRemovedFilesToStatusMap.size === 0) {
        return {
            deletedFiles,
            ignoredFilesStats: new Set<string>(),
            nonSyntacticChangesFiles: new Set<string>(),
            relevantDiffs: new Set<string>(),
        }
    }

    // Parse full diff to extract per-file diffs
    const fileDiffs = new Map<string, string>()
    const diffBlocks = fullDiff.split(/^diff --git /m).filter(Boolean)

    for (const block of diffBlocks) {
        const match = block.match(/^a\/(.+?) b\/.+$/m)
        if (match) {
            const filename = match[1]
            fileDiffs.set(filename, `diff --git ${block}`)
        }
    }

    const ignoredFilesStats = new Set<string>()
    const nonSyntacticChangesFiles = new Set<string>()
    const relevantDiffs = new Set<string>()

    // Process ignored files in parallel
    const ignoredFiles = [...nonRemovedFilesToStatusMap.keys()].filter(
        (file) => !shouldIncludeFile(file)
    )

    const ignoredStats = await Promise.allSettled(
        ignoredFiles.map((file) => git.raw([...baseArgs, '--numstat', '--pretty=format:', '--', file]))
    )

    for (const result of ignoredStats) {
        if (result.status === 'fulfilled' && result.value.trim().length > 0) {
            const numstatLine = result.value
            const parts = numstatLine.trim().split(/\s+/)

            if (parts.length !== 3) {
                continue
            }

            const [insertions, deletions, filename] = parts
            ignoredFilesStats.add(`${filename}: ${insertions} insertions(+), ${deletions} deletions(-)`)
        }
    }

    // Process relevant files
    for (const file of nonRemovedFilesToStatusMap.keys()) {
        if (!shouldIncludeFile(file)) {
            continue
        }

        const diff = fileDiffs.get(file) || ''
        if (diff.trim() === '') {
            nonSyntacticChangesFiles.add(file)
        } else {
            relevantDiffs.add(diff)
        }
    }

    return {
        deletedFiles,
        ignoredFilesStats,
        nonSyntacticChangesFiles,
        relevantDiffs,
    }
}

export type DiffAnalyzerParams = {
    commitHash: string,
    remainingTokens: number,
    type: 'reword',
} | {
    remainingTokens: number,
    type: 'commit',
}

export async function diffAnalyzer(params: DiffAnalyzerParams) {
    const INCLUDE_MAXIMAL_FILE_COUNT = 5
    const {
 deletedFiles, ignoredFilesStats, nonSyntacticChangesFiles, relevantDiffs 
} = await diffFilesPerType(params)

    const filteredDiffs: string[] = ['Diffs:']
    if (relevantDiffs.size > 0) {
        filteredDiffs.push(
            ...[...relevantDiffs].map((diff, index) => `${'\n'.repeat(Math.min(1, index))}${filterDiffForLLM(diff)}`)
        )
    }

    const fixedParts: string[][] = []
    if (deletedFiles.size > 0) {
        const message = [
            '\n\nFiles which got deleted:',
            deletedFiles.values().take(INCLUDE_MAXIMAL_FILE_COUNT).toArray().join('\n'),
        ]

        if (deletedFiles.size > INCLUDE_MAXIMAL_FILE_COUNT) {
            message.push(`...and ${deletedFiles.size - INCLUDE_MAXIMAL_FILE_COUNT} more.`)
        }

        fixedParts.push(message)
    }

    if (nonSyntacticChangesFiles.size > 0) {
        const message = [
            '\n\nFiles with non syntactic changes:',
            nonSyntacticChangesFiles.values().take(INCLUDE_MAXIMAL_FILE_COUNT).toArray().join('\n'),
        ]

        if (nonSyntacticChangesFiles.size > INCLUDE_MAXIMAL_FILE_COUNT) {
            message.push(`...and ${nonSyntacticChangesFiles.size - INCLUDE_MAXIMAL_FILE_COUNT} more.`)
        }

        fixedParts.push(message)
    }

    if (ignoredFilesStats.size > 0) {
        const message = [
            '\n\nFiles that are ignored because they are likely to be generated or lock files:',
            ignoredFilesStats.values().take(INCLUDE_MAXIMAL_FILE_COUNT).toArray().join('\n'),
        ]

        if (ignoredFilesStats.size > INCLUDE_MAXIMAL_FILE_COUNT) {
            message.push(`...and ${ignoredFilesStats.size - INCLUDE_MAXIMAL_FILE_COUNT} more.`)
        }

        fixedParts.push(message)
    }

    const fixedPartsString = fixedParts.flatMap(message => message.flat()).join('\n')
    const tokensForFixedParts = encode(fixedPartsString).length
    const diffsWithinTokenLimit = fitDiffsWithinTokenLimit(filteredDiffs, params.remainingTokens - tokensForFixedParts).join('\n').trim()

    return diffsWithinTokenLimit + fixedPartsString
}

function shouldIncludeFile(file: string, ignorePatterns: string[] = [
    'package-lock.json',
    'pnpm-lock.yaml',
    'yarn.lock',
    '*.lock',
    '*.min.js',
    'dist/**',
    'build/**',
    'node_modules/**',
]) {
    return !ignorePatterns.some(pattern => {
        if (pattern.includes('*')) {
            const regex = new RegExp('^' + pattern.replaceAll('**', '.*').replaceAll('*', '[^/]*') + '$')
            return regex.test(file)
        }

        return file === pattern
    })
}

/**
 * Filters a git diff for LLM input to minimize tokens:
 * - Keeps changed lines (+/-) and limited context
 * - Keeps @@ lines but strips the position info (only keeps trailing context)
 * - Removes index, binary, and other metadata lines
 * - Keeps file headers (diff --git)
 */
function filterDiffForLLM(diff: string): string {
    const lines = diff.split('\n')
    const keep: string[] = []
    const contextRadius = 2

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        // Skip other metadata
        if (/^(index|Binary files|old mode|new mode)/.test(line)) {
            continue
        }

        // Keep file headers
        if (line.startsWith('diff --git ')) {
            keep.push(line)
            continue
        }

        // Handle @@ lines: keep only context text after them
        if (line.startsWith('@@')) {
            const cleaned = line.replace(/^@@.*@@ ?/, '').trim()
            if (cleaned.length > 0) {
                keep.push(cleaned)
            }

            continue
        }

        // Keep modified lines and a few context ones
        if (/^[+-]/.test(line)) {
            if (line.startsWith('+++') || line.startsWith('---')) {
                continue
            }

            const start = Math.max(0, i - contextRadius)
            const end = Math.min(lines.length, i + contextRadius + 1)
            for (let j = start; j < end; j++) {
                const neighbor = lines[j]
                if (/^(index|@@|Binary files|old mode|new mode)/.test(neighbor)) {
                    continue
                }

                if (!keep.includes(neighbor)) {
                    keep.push(neighbor)
                }
            }
        }
    }

    return keep.join('\n').trim()
}


/**
 * Fit diffs within a given token limit.
 *
 * @param diffs An array of diffs.
 * @param maxTokens The maximum total number of tokens allowed.
 * @returns A trimmed version of `diffs`, ensuring total tokens stay within the limit.
 */
function fitDiffsWithinTokenLimit(diffs: string[], maxTokens: number) {
    // Attach original indices to each diff and sort by diff length (shortest first)
    const sortedDiffs = diffs
        .map((diffText, originalIndex) => ({
 diffText,
originalIndex 
}))
        .sort((a, b) => a.diffText.length - b.diffText.length)

    let tokensLeft = maxTokens
    let avgTokensPerDiff = tokensLeft / sortedDiffs.length
    const keptDiffs: { diffText: string;
originalIndex: number }[] = []

    // TODO: handle case where there are far too many diffs —
    // could discard extras or use LLM-based prioritization.

    for (const [diffIndex, { diffText, originalIndex }] of sortedDiffs.entries()) {
        const fitsWithinLimit = isWithinTokenLimit(diffText, avgTokensPerDiff)

        // console.log('---------------------------------------');
        // console.log('fitsWithinLimit :>>', fitsWithinLimit);
        // console.log('tokensLeft :>>', tokensLeft);
        // console.log('avgTokensPerDiff :>>', avgTokensPerDiff);

        if (fitsWithinLimit === false) {
            // const tokenCount = encode(diffText).length;
            // console.log('tokenCount :>>', tokenCount);

            // TODO: consider trimming equally from start and end while preserving diff headers
            const trimmedDiff = decode(encode(diffText).slice(0, avgTokensPerDiff))
            keptDiffs.push({
 diffText: trimmedDiff,
originalIndex 
})
            tokensLeft -= avgTokensPerDiff
        } else {
            keptDiffs.push({
 diffText,
originalIndex 
})
            tokensLeft -= fitsWithinLimit
        }

        // console.log('---------------------------------------');

        const remainingDiffs = diffs.length - 1 - diffIndex
        if (remainingDiffs > 0) {
            avgTokensPerDiff = tokensLeft / remainingDiffs
        }
    }

    // Restore the original order within the section
    keptDiffs.sort((a, b) => a.originalIndex - b.originalIndex)

    // Return only the diff text strings, in section structure
    return keptDiffs.map(diff => diff.diffText)
}
