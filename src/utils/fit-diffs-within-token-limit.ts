import { decode, encode, isWithinTokenLimit } from 'gpt-tokenizer'

export function fitDiffsWithinTokenLimit(diffs: string[], maxTokens: number): string[] {
    const sortedIndexedDiffs = diffs
        .map((diff, index) => ({ diff, index }))
        .sort((a, b) => a.diff.length - b.diff.length);

    const kept: { diff: string; index: number }[] = []
    let remainingTokens = maxTokens;
    let remainingTokensPerDiff = remainingTokens / diffs.length;

    for (const { diff, index } of sortedIndexedDiffs) {
        const withinTokenLimit = isWithinTokenLimit(diff, remainingTokensPerDiff)
        remainingTokens -= withinTokenLimit || remainingTokensPerDiff;

        // the diff is too long to fit in the token limit, so we trim it and keep the shortened version
        if(!withinTokenLimit) {
            // encode and decode the diff and trim it to the remaining token limit
            kept.push(
                {
                    diff: decode(encode(diff).slice(0, remainingTokensPerDiff)),
                    index,
                }
            )
            continue;
        }

        if (index < diffs.length - 1) {
            remainingTokensPerDiff = remainingTokens / (diffs.length - 1 - index);
        }

        kept.push(
            {
                diff,
                index,
            }
        )
    }

    kept.sort((a, b) => a.index - b.index)

    return kept.map(k => k.diff)
}
