import { simpleGit } from "simple-git";

import { decode, encode, isWithinTokenLimit } from "./gpt-tokenizer.js";

async function diffFilesPerType(params: DiffAnalyzerParams) {
    const git = simpleGit();

    const isStaged = params.type === "commit";

    const baseArgs = isStaged
        ? ["diff", "--cached"]
        : ["show", params.commitHash];

    // 1) get all changed files + status in one call
    const nameStatus = await git.raw([
        ...baseArgs,
        "--name-status",
        "--pretty=",
    ]);

    const changedFiles = new Set<string>();
    const deletedFiles = new Set<string>();

    for (const line of nameStatus.split("\n").filter(Boolean)) {
        const [status, name] = line.trim().split(/\s+/);
        if (!name) {
            continue;
        }

        if (status === "D") {
            deletedFiles.add(name);
        } else {
            changedFiles.add(name);
        }
    }

    if (changedFiles.size === 0) {
        return {
            deletedFiles,
            ignoredFiles: new Set<string>(),
            nonSyntacticChangesFiles: new Set<string>(),
            relevantDiffs: new Set<string>(),
        };
    }

    const ignoredFilesStats = new Set<string>()
    const nonSyntacticChangesFiles = new Set<string>()
    const relevantDiffs = new Set<string>()

    // Common args for diff content
    const diffArgsCommon = ["-w", "--ignore-blank-lines"];

    for (const file of changedFiles) {
        if (!shouldIncludeFile(file)) {
            const ignoredFileStats = await git.raw([...baseArgs, "--stat", file])
            ignoredFilesStats.add(ignoredFileStats)
            continue;
        }

        const diff = await git.raw(
            isStaged
                ? [...baseArgs, ...diffArgsCommon, "--", file]
                : [...baseArgs, "--pretty=", ...diffArgsCommon, "--", file]
        );

        if (diff.trim() === "") {
            nonSyntacticChangesFiles.add(file)
            continue
        }

        relevantDiffs.add(diff)
    }

    return {
        deletedFiles,
        ignoredFiles: ignoredFilesStats,
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

export async function diffAnalyzer(params: DiffAnalyzerParams) {
    const INCLUDE_MAXIMAL_FILE_COUNT = 5;
    const git = simpleGit();
    const { deletedFiles, ignoredFiles, nonSyntacticChangesFiles, relevantDiffs } = await diffFilesPerType(params)

    const messageParts: string[][] = []
    if (relevantDiffs.size > 0) {
        const filteredDiffs = [...relevantDiffs].map((diff, index) => `${"\n".repeat(Math.min(1, index))}${filterDiffForLLM(diff)}`)
        messageParts.push([
            "Diffs:",
            ...filteredDiffs
        ])
    }

    if (deletedFiles.size > 0) {
        const message = [
            "\n\nFiles which got deleted:",
            ...deletedFiles.values().toArray(),
        ]

        messageParts.push(message)
    }

    if (nonSyntacticChangesFiles.size > 0) {
        const message = [
            "\n\nFiles with non syntactic changes:",
            [...nonSyntacticChangesFiles].join("\n")
        ]

        if (nonSyntacticChangesFiles.size > INCLUDE_MAXIMAL_FILE_COUNT) {
            message.push(`...and ${nonSyntacticChangesFiles.size - INCLUDE_MAXIMAL_FILE_COUNT} more.`)
        }

        messageParts.push(message)
    }

    if (ignoredFiles.size > 0) {
        const ignoredFilesDiffStats = await Promise.all(ignoredFiles.values().take(INCLUDE_MAXIMAL_FILE_COUNT).map(file => git.diff([...checkAgainst, "--stat", file])))
        const message = [
            "\n\nFiles that are ignored because they are likely to be generated or lock files:",
            ignoredFilesDiffStats.join("\n"),
        ]

        if (ignoredFiles.size > INCLUDE_MAXIMAL_FILE_COUNT) {
            message.push(`...and ${ignoredFiles.size - INCLUDE_MAXIMAL_FILE_COUNT} more.`)
        }

        messageParts.push(message)
    }

    return fitDiffsWithinTokenLimit(messageParts, params.remainingTokens).join("\n").trim()
}

function shouldIncludeFile(file: string, ignorePatterns: string[] = [
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "*.lock",
    "*.min.js",
    "dist/**",
    "build/**",
    "node_modules/**",
]) {
    return !ignorePatterns.some(pattern => {
        if (pattern.includes("*")) {
            const regex = new RegExp("^" + pattern.replaceAll('**', ".*").replaceAll('*', "[^/]*") + "$");
            return regex.test(file);
        }

        return file === pattern;
    });
}

/**
 * Filters a git diff for LLM input to minimize tokens:
 * - Keeps changed lines (+/-) and limited context
 * - Keeps @@ lines but strips the position info (only keeps trailing context)
 * - Removes index, binary, and other metadata lines
 * - Keeps file headers (diff --git)
 */
function filterDiffForLLM(diff: string): string {
    const lines = diff.split("\n");
    const keep: string[] = [];
    const contextRadius = 2;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip other metadata
        if (/^(index|Binary files|old mode|new mode)/.test(line)) {
            continue;
        }

        // Keep file headers
        if (line.startsWith('diff --git ')) {
            keep.push(line);
            continue;
        }

        // Handle @@ lines: keep only context text after them
        if (line.startsWith('@@')) {
            const cleaned = line.replace(/^@@.*@@ ?/, "").trim();
            if (cleaned.length > 0) {
                keep.push(cleaned);
            }

            continue;
        }

        // Keep modified lines and a few context ones
        if (/^[+-]/.test(line)) {
            if (line.startsWith('+++') || line.startsWith('---')) {
                continue;
            }

            const start = Math.max(0, i - contextRadius);
            const end = Math.min(lines.length, i + contextRadius + 1);
            for (let j = start; j < end; j++) {
                const neighbor = lines[j];
                if (/^(index|@@|Binary files|old mode|new mode)/.test(neighbor)) {
                    continue
                }

                if (!keep.includes(neighbor)) {
                    keep.push(neighbor);
                }
            }
        }
    }

    return keep.join("\n").trim();
}


/**
 * Fit diffs within a given token limit.
 *
 * @param diffGroups An array of diff sections, where each section is an array of diff strings.
 * @param maxTokens The maximum total number of tokens allowed.
 * @returns A trimmed version of `diffGroups`, ensuring total tokens stay within the limit.
 */
function fitDiffsWithinTokenLimit(diffGroups: string[][], maxTokens: number) {
    // Attach original indices to each diff and sort by diff length (shortest first)
    const sortedDiffGroups = diffGroups.map(section =>
        section
            .map((diffText, originalIndex) => ({ diffText, originalIndex }))
            .sort((a, b) => a.diffText.length - b.diffText.length)
    );

    let tokensLeft = maxTokens;
    let avgTokensPerDiff = tokensLeft / sortedDiffGroups.flat().length;
    const keptDiffGroups: { diffText: string; originalIndex: number }[][] = [];

    // TODO: handle case where there are far too many diffs —
    // could discard extras or use LLM-based prioritization.

    for (const [groupIndex, section] of sortedDiffGroups.entries()) {
        keptDiffGroups.push([]);

        for (const [diffIndex, { diffText, originalIndex }] of section.entries()) {
            const fitsWithinLimit = isWithinTokenLimit(diffText, avgTokensPerDiff);

            // console.log('---------------------------------------');
            // console.log('fitsWithinLimit :>>', fitsWithinLimit);
            // console.log('tokensLeft :>>', tokensLeft);
            // console.log('avgTokensPerDiff :>>', avgTokensPerDiff);

            if (fitsWithinLimit === false) {
                // const tokenCount = encode(diffText).length;
                // console.log('tokenCount :>>', tokenCount);

                // TODO: consider trimming equally from start and end while preserving diff headers
                const trimmedDiff = decode(encode(diffText).slice(0, avgTokensPerDiff));
                keptDiffGroups[groupIndex].push({ diffText: trimmedDiff, originalIndex });
                tokensLeft -= avgTokensPerDiff;
            } else {
                keptDiffGroups[groupIndex].push({ diffText, originalIndex });
                tokensLeft -= fitsWithinLimit;
            }

            // console.log('---------------------------------------');

            const remainingDiffs = section.length - 1 - diffIndex;
            if (remainingDiffs > 0) {
                avgTokensPerDiff = tokensLeft / remainingDiffs;
            }
        }

        // Restore the original order within the section
        keptDiffGroups[groupIndex].sort((a, b) => a.originalIndex - b.originalIndex);
    }

    // Return only the diff text strings, in section structure
    return keptDiffGroups.flatMap(section => section.flatMap(({ diffText }) => diffText));
}
