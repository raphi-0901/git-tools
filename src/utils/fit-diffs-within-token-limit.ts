import { decode, encode, isWithinTokenLimit } from 'gpt-tokenizer'

export function fitDiffsWithinTokenLimit(diffs: string[], maxTokens: number): string[] {
    const sortedIndexedDiffs = diffs
        .map((diff, initialIndex) => ({ diff, initialIndex }))
        .sort((a, b) => a.diff.length - b.diff.length);

    let remainingTokens = maxTokens;
    let remainingTokensPerDiff = remainingTokens / diffs.length;
    const kept: { diff: string; initialIndex: number }[] = [];

    // todo what to do if there are too many diffs?
    // maybe only keep the first n diffs or something like that
    // another option is to let an llm decide what to keep and what to trim

    for (let i = 0; i < sortedIndexedDiffs.length; i++) {
        const { diff, initialIndex } = sortedIndexedDiffs[i];
        const withinTokenLimit = isWithinTokenLimit(diff, remainingTokensPerDiff);


        console.log('---------------------------------------');
        console.log('withinTokenLimit :>>', withinTokenLimit);
        console.log('remainingTokens :>>', remainingTokens);
        console.log('remainingTokensPerDiff :>>', remainingTokensPerDiff);



        if (withinTokenLimit === false) {
            console.log('tokensOfDiff :>>', encode(diff).length);

            // TODO: maybe trim of the end and the start at the same amount??
            // but we should keep the first 3 lines, so basic informations like which diff

            // Too long: trim it and keep the shortened version
            const trimmed = decode(encode(diff).slice(0, remainingTokensPerDiff));
            kept.push({ diff: trimmed, initialIndex });
            remainingTokens -= remainingTokensPerDiff;
        } else {
            // Fits fine
            kept.push({ diff, initialIndex });
            remainingTokens -= withinTokenLimit;
        }

        console.log('---------------------------------------');

        const remainingCount = sortedIndexedDiffs.length - 1 - i;
        if (remainingCount > 0) {
            remainingTokensPerDiff = remainingTokens / remainingCount;
        }
    }

    kept.sort((a, b) => a.initialIndex - b.initialIndex);
    return kept.map(k => k.diff);
}
