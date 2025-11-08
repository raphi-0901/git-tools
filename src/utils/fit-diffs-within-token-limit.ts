import { decode, encode, isWithinTokenLimit } from '../utils/gpt-tokenizer.js'

/**
 * Fit diffs within a given token limit.
 *
 * @param diffGroups An array of diff sections, where each section is an array of diff strings.
 * @param maxTokens The maximum total number of tokens allowed.
 * @returns A trimmed version of `diffGroups`, ensuring total tokens stay within the limit.
 */
export function fitDiffsWithinTokenLimit(diffGroups: string[][], maxTokens: number) {
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

            console.log('---------------------------------------');
            console.log('fitsWithinLimit :>>', fitsWithinLimit);
            console.log('tokensLeft :>>', tokensLeft);
            console.log('avgTokensPerDiff :>>', avgTokensPerDiff);

            if (fitsWithinLimit === false) {
                const tokenCount = encode(diffText).length;
                console.log('tokenCount :>>', tokenCount);

                // TODO: consider trimming equally from start and end while preserving diff headers
                const trimmedDiff = decode(encode(diffText).slice(0, avgTokensPerDiff));
                keptDiffGroups[groupIndex].push({ diffText: trimmedDiff, originalIndex });
                tokensLeft -= avgTokensPerDiff;
            } else {
                keptDiffGroups[groupIndex].push({ diffText, originalIndex });
                tokensLeft -= fitsWithinLimit;
            }

            console.log('---------------------------------------');

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
