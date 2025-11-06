import { decode, encode, isWithinTokenLimit } from 'gpt-tokenizer'

export function fitDiffsWithinTokenLimit(diffs: string[], maxTokens: number): string[] {
    const sortedIndexedDiffs = diffs
        .map((diff, initialIndex) => ({ diff, initialIndex }))
        .sort((a, b) => a.diff.length - b.diff.length);

    let remainingTokens = maxTokens;
    let remainingTokensPerDiff = remainingTokens / diffs.length;
    const kept: { diff: string; initialIndex: number }[] = [];

    for (let i = 0; i < sortedIndexedDiffs.length; i++) {
        const { diff, initialIndex } = sortedIndexedDiffs[i];
        const withinTokenLimit = isWithinTokenLimit(diff, remainingTokensPerDiff);

        console.log('withinTokenLimit :>>', withinTokenLimit);


        if (withinTokenLimit === false) {
            // we should keep the first 3 lines, so basic informations like which diff

            console.log('Diff to long:', diff);


            // Too long: trim it and keep the shortened version
            const trimmed = decode(encode(diff).slice(0, remainingTokensPerDiff));
            kept.push({ diff: trimmed, initialIndex });
            remainingTokens -= remainingTokensPerDiff;
        } else {
            // Fits fine
            kept.push({ diff, initialIndex });
            remainingTokens -= withinTokenLimit;
        }

        const remainingCount = sortedIndexedDiffs.length - 1 - i;
        if (remainingCount > 0) {
            remainingTokensPerDiff = remainingTokens / remainingCount;
        }
    }

    kept.sort((a, b) => a.initialIndex - b.initialIndex);
    return kept.map(k => k.diff);
}
