import { getSimpleGit } from "./getSimpleGit.js";
import { encode } from "./gptTokenizer.js";

type FilesPerDiffType = {
    deletedFiles: Set<string>;
    ignoredFilesStats: Set<string>;
    nonSyntacticChangesFiles: Set<string>;
    relevantDiffs: Set<string>;
}

/**
 * Computes diffs for files in a commit or staged changes, categorizing them by status,
 * ignored files, and non-syntactic changes.
 *
 * @param {DiffAnalyzerParams} params - Parameters for analyzing diffs.
 * @returns {Promise<FilesPerDiffType>} Object containing sets of deleted files, ignored files stats, non-syntactic changes, and relevant diffs.
 */
async function diffFilesPerType(params: DiffAnalyzerParams): Promise<FilesPerDiffType> {
    const git = getSimpleGit();
    const isStaged = params.type === "commit";
    const baseArgs = isStaged
        ? ["diff", "--cached"]
        : ["show", params.commitHash];

    // Get both name-status AND full diff in parallel
    const [nameStatus, fullDiff] = await Promise.all([
        git.raw([...baseArgs, "--name-status", "--pretty=format:"]),
        git.raw([
            ...baseArgs,
            "--pretty=format:",
            "-w",
            "--ignore-blank-lines",
        ]),
    ]);

    const nonRemovedFilesToStatusMap = new Map<string, string>();
    const deletedFiles = new Set<string>();

    for (const line of nameStatus.split("\n").filter(Boolean)) {
        const match = line.trim().match(/^(\S+)\s+(.+)$/);
        if (!match) {
            continue;
        }

        const [, status, name] = match;

        if (status === "D") {
            deletedFiles.add(name);
        } else {
            nonRemovedFilesToStatusMap.set(name, status);
        }
    }

    if (nonRemovedFilesToStatusMap.size === 0) {
        return {
            deletedFiles,
            ignoredFilesStats: new Set<string>(),
            nonSyntacticChangesFiles: new Set<string>(),
            relevantDiffs: new Set<string>(),
        };
    }

    // Parse full diff to extract per-file diffs
    const fileDiffs = new Map<string, string>();
    const diffBlocks = fullDiff.split(/^diff --git /m).filter(Boolean);

    for (const block of diffBlocks) {
        const match = block.match(/^a\/(.+?) b\/.+$/m);
        if (match) {
            const filename = match[1];
            fileDiffs.set(filename, `diff --git ${block}`);
        }
    }

    const ignoredFilesStats = new Set<string>();
    const nonSyntacticChangesFiles = new Set<string>();
    const relevantDiffs = new Set<string>();

    // Process ignored files in parallel
    const ignoredFiles = [...nonRemovedFilesToStatusMap.keys()].filter(
        (file) => !shouldIncludeFile(file)
    );

    const ignoredStats = await Promise.allSettled(
        ignoredFiles.map((file) => git.raw([...baseArgs, "--numstat", "--pretty=format:", "--", file]))
    );

    for (const result of ignoredStats) {
        if (result.status === 'fulfilled' && result.value.trim().length > 0) {
            const numstatLine = result.value;
            const parts = numstatLine.trim().split(/\s+/);

            if (parts.length !== 3) {
                continue;
            }

            const [insertions, deletions, filename] = parts;
            ignoredFilesStats.add(`${filename}: ${insertions} insertions(+), ${deletions} deletions(-)`);
        }
    }

    // Process relevant files
    for (const file of nonRemovedFilesToStatusMap.keys()) {
        if (!shouldIncludeFile(file)) {
            continue;
        }

        const diff = fileDiffs.get(file) || "";
        if (diff.trim() === "") {
            nonSyntacticChangesFiles.add(file);
        } else {
            relevantDiffs.add(diff);
        }
    }

    // handle edge case, see https://github.com/raphi-0901/git-tools/issues/56
    if (nonSyntacticChangesFiles.size > 0 && relevantDiffs.size === 0 && deletedFiles.size === 0 && ignoredFilesStats.size === 0) {
        // move nonSyntacticChangesFiles to relevantDiffs, but at most 3 files
        const nonSyntacticChangesFilesArray = [...nonSyntacticChangesFiles]
        nonSyntacticChangesFiles.clear()

        const expandedDiffs = await Promise.all(nonSyntacticChangesFilesArray.map(async file => ({
                diff: await git.raw([
                    ...baseArgs,
                    "--pretty=format:",
                    "--ignore-blank-lines",
                    file
                ]),
                file
            })))

        let counter = 0;
        for (const { diff, file } of expandedDiffs) {
            if(diff.trim() === "" || counter >= 3) {
                nonSyntacticChangesFiles.add(file)
            }
            else {
                counter++;
                relevantDiffs.add(diff)
            }
        }
    }

    return {
        deletedFiles,
        ignoredFilesStats,
        nonSyntacticChangesFiles,
        relevantDiffs,
    };
}

export type DiffAnalyzerParams = {
    commitHash: string,
    remainingTokens: number,
    type: "reword",
} | {
    remainingTokens: number,
    type: "commit",
}

/**
 * Analyzes diffs and formats them for LLM consumption.
 *
 * @param {DiffAnalyzerParams} params - The parameters are controlling which diffs to analyze.
 * @returns {Promise<string>} Formatted diff output including relevant changes, deleted files, and ignored files stats.
 */
export async function diffAnalyzer(params: DiffAnalyzerParams): Promise<string> {
    const INCLUDE_MAXIMAL_FILE_COUNT = 5;
    const { deletedFiles, ignoredFilesStats, nonSyntacticChangesFiles, relevantDiffs } = await diffFilesPerType(params)

    const filteredDiffs: string[] = []
    if (relevantDiffs.size > 0) {
        filteredDiffs.push(
            ...[...relevantDiffs].map((diff, index) => `${"\n".repeat(Math.min(1, index))}${filterDiffForLLM(diff)}`)
        )
    } else {
        filteredDiffs.push("No relevant changes found.")
    }

    const fixedParts: string[][] = []
    if (deletedFiles.size > 0) {
        const message = [
            "\n\nFiles which got deleted:",
            deletedFiles.values().take(INCLUDE_MAXIMAL_FILE_COUNT).toArray().join("\n"),
        ]

        if (deletedFiles.size > INCLUDE_MAXIMAL_FILE_COUNT) {
            message.push(`...and ${deletedFiles.size - INCLUDE_MAXIMAL_FILE_COUNT} more.`)
        }

        fixedParts.push(message)
    }

    if (nonSyntacticChangesFiles.size > 0) {
        const message = [
            "\n\nFiles with non syntactic changes:",
            nonSyntacticChangesFiles.values().take(INCLUDE_MAXIMAL_FILE_COUNT).toArray().join("\n"),
        ]

        if (nonSyntacticChangesFiles.size > INCLUDE_MAXIMAL_FILE_COUNT) {
            message.push(`...and ${nonSyntacticChangesFiles.size - INCLUDE_MAXIMAL_FILE_COUNT} more.`)
        }

        fixedParts.push(message)
    }

    if (ignoredFilesStats.size > 0) {
        const message = [
            "\n\nFiles with generated content:",
            ignoredFilesStats.values().take(INCLUDE_MAXIMAL_FILE_COUNT).toArray().join("\n"),
        ]

        if (ignoredFilesStats.size > INCLUDE_MAXIMAL_FILE_COUNT) {
            message.push(`...and ${ignoredFilesStats.size - INCLUDE_MAXIMAL_FILE_COUNT} more.`)
        }

        fixedParts.push(message)
    }

    const fixedPartsString = fixedParts.flatMap(message => message.flat()).join("\n")
    const diffHeader = "Diffs:"
    const tokensForFixedParts = encode(fixedPartsString).length + encode(diffHeader).length;
    const diffsWithinTokenLimit = fitDiffsWithinTokenLimit(filteredDiffs, params.remainingTokens - tokensForFixedParts).join("\n").trim()

    return `
${diffHeader}
${diffsWithinTokenLimit}
${fixedPartsString}
`.trim()
}

/**
 * Checks whether a file should be included for diff analysis.
 *
 * @param {string} file - File path.
 * @param {string[]} [ignorePatterns] - Optional array of glob patterns to ignore.
 * @returns {boolean} True if the file should be included, false otherwise.
 */
function shouldIncludeFile(file: string, ignorePatterns: string[] = [
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "*.lock",
    "*.min.js",
    "dist/**",
    "build/**",
    "node_modules/**",
]): boolean {
    return !ignorePatterns.some(pattern => {
        if (pattern.includes("*")) {
            const regex = new RegExp("^" + pattern.replaceAll('**', ".*").replaceAll('*', "[^/]*") + "$");
            return regex.test(file);
        }

        return file === pattern;
    });
}

/**
 * Determines whether a line in a diff represents a meaningful change.
 *
 * @param {string} line - A line from a diff.
 * @returns {boolean} True if the line is a meaningful addition or deletion.
 */
function isMeaningfulChange(line: string): boolean {
    return (line.startsWith("+") || line.startsWith("-")) &&
        !line.startsWith("+++ ") &&
        !line.startsWith("--- ") &&
        line.slice(1).trim() !== "";
}

/**
 * Determines whether a line in a diff is an empty change.
 *
 * @param {string} line - A line from a diff.
 * @returns {boolean} True if the line is an addition or deletion with no content.
 */
function isEmptyChangeLine(line: string): boolean {
    return (line.startsWith("+") || line.startsWith("-")) && line.slice(1).trim() === "";
}

/**
 * Filters a diff to only include meaningful hunks and removes empty or irrelevant lines.
 *
 * @param {string} diff - Raw git diff for a file.
 * @returns {string} Filtered diff suitable for LLM consumption.
 */
export function filterDiffForLLM(diff: string): string {
    const lines = diff.split("\n");

    const result: string[] = [];
    let currentHunk: string[] = [];
    let inHunk = false;
    let hunkHasChanges = false;
    let oldMode = null;
    let newMode = null;

    const flushHunk = () => {
        if (inHunk && hunkHasChanges) {
            result.push(...currentHunk);
        }

        currentHunk = [];
        hunkHasChanges = false;
        inHunk = false;
    };

    const resetFileModeVariables = () => {
        oldMode = null;
        newMode = null;
    }

    for (const line of lines) {
        // Start of new hunk
        if (line.startsWith("@@")) {
            flushHunk();
            resetFileModeVariables();
            inHunk = true;

            const context = line.replace(/^@@.*@@ ?/, "").trim();
            const marker = context ? `@@ ${context}` : "@@";
            currentHunk.push(marker);
            continue;
        }

        // File-level headers
        if (!inHunk) {
            if (line.startsWith("diff --git")) {
                const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);

                if (match) {
                    const [, left, right] = match;

                    if (left === right) {
                        result.push(`diff ${left}`);
                    } else {
                        // rename or move -> keep full info
                        result.push(`diff ${left} ${right}`);
                    }
                } else {
                    result.push(line);
                }

                continue;
            }

            if(line.startsWith("old mode")) {
                oldMode = line.replace(/^old mode (\d+)$/, "$1");
            }

            if(line.startsWith("new mode")) {
                newMode = line.replace(/^new mode (\d+)$/, "$1");
            }

            if(oldMode && newMode && oldMode !== newMode) {
                result.push(`Changed file permissions from ${oldMode} to ${newMode}`)
                resetFileModeVariables();
            }

            continue;
        }

        // Skip empty + / - lines entirely
        if (isEmptyChangeLine(line)) {
            continue;
        }

        // Detect meaningful change
        if (isMeaningfulChange(line)) {
            hunkHasChanges = true;
        }

        // check for empty context lines
        if (line.trim() === "") {
            continue;
        }

        // Keep line (context or meaningful change)
        currentHunk.push(line);
    }

    flushHunk();

    return result.join("\n").trim();
}

/**
 * Truncates an array of diffs to fit within a token limit.
 *
 * @param {string[]} diffs - Array of diff strings.
 * @param {number} maxTokens - Maximum allowed token count.
 * @returns {string[]} Filtered and truncated diffs.
 */
function fitDiffsWithinTokenLimit(diffs: string[], maxTokens: number): string[] {
    // Minimal meaningful diff size (in tokens)
    const MIN_TOKENS_PER_DIFF = 50;

    // Maximal number of diffs to consider with structure-aware truncation
    const diffCap = Math.min(Math.floor(maxTokens / MIN_TOKENS_PER_DIFF), diffs.length);

    // Attach original indices and sort by token count (smallest first)
    const sortedDiffs = diffs
        .map((diffText, originalIndex) => ({
            diffText,
            originalIndex,
            tokenCount: encode(diffText).length
        }))
        .sort((a, b) => a.tokenCount - b.tokenCount)
        .slice(0, diffCap);

    let tokensLeft = maxTokens;
    let avgTokensPerDiff = tokensLeft / sortedDiffs.length;
    const keptDiffs: { diffText: string; originalIndex: number }[] = [];

    for (const [diffIndex, { diffText, originalIndex, tokenCount }] of sortedDiffs.entries()) {
        // Not enough tokens for meaningful diff
        if (tokensLeft < MIN_TOKENS_PER_DIFF) {
            break;
        }

        // Determine how many tokens this diff can get
        const allowedTokens = Math.min(tokenCount, Math.floor(avgTokensPerDiff), tokensLeft);

        // Structure-aware truncation
        const truncatedDiff = allowedTokens < tokenCount
            ? truncateDiffPerLine(diffText, allowedTokens)
            : diffText;

        keptDiffs.push({ diffText: truncatedDiff, originalIndex });
        tokensLeft -= encode(truncatedDiff).length;

        const remainingDiffs = sortedDiffs.length - 1 - diffIndex;
        if (remainingDiffs > 0) {
            avgTokensPerDiff = tokensLeft / remainingDiffs;
        }
    }

    // Restore original order
    keptDiffs.sort((a, b) => a.originalIndex - b.originalIndex);

    return keptDiffs.map(d => d.diffText);
}

/**
 * Truncates a diff line-by-line until reaching a maximum token count.
 *
 * @param {string} diffText - Raw diff text.
 * @param {number} maxTokens - Maximum tokens allowed.
 * @returns {string} Truncated diff text.
 */
function truncateDiffPerLine(diffText: string, maxTokens: number): string {
    const lines = diffText.split("\n");
    const resultLines: string[] = [];
    let tokenCount = 0;

    for (const line of lines) {
        const lineTokens = encode(line).length;
        if (tokenCount + lineTokens > maxTokens) {
            break;
        }

        resultLines.push(line);
        tokenCount += lineTokens;
    }

    return resultLines.join("\n");
}
