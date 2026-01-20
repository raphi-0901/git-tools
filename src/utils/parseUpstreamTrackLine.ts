import { RemoteStatus } from "../types/RemoteStatus.js";

type RemoveRemoteBranch<T> = T extends unknown
    ? Omit<T, "remoteBranch">
    : never;

/**
 * Parse the long upstream tracking format produced by
 * `git for-each-ref --format='%(upstream:track)'`.
 *
 * Supported inputs:
 * - "" -> upstream is assumed to be synced
 * - "[ahead N]"
 * - "[behind N]"
 * - "[ahead N, behind M]" (order-independent)
 *
 * Notes:
 * - Git emits an empty string when upstream is synced.
 * - When non-empty, the format always contains numeric counts
 *   next to the keywords "ahead" and/or "behind".
 *
 * @param track - Raw `%(upstream:track)` string
 * @returns An object describing the upstream tracking state
 *
 * @example
 * parseUpstreamTrackLong("[ahead 2]")
 * // { ahead: 2, behind: 0, hasUpstream: true }
 *
 * @example
 * parseUpstreamTrackLong("")
 * // { ahead: 0, behind: 0, hasUpstream: true }
 */
export function parseUpstreamTrackLong(track: string): null | RemoveRemoteBranch<Exclude<RemoteStatus, { type: "no-remote" }>> {
    const trimmedTrack = (track ?? "").trim();

    // Empty means: synced or no upstream configured, but in preconditions, this assumes to be synced.
    if (!trimmedTrack) {
        return {
            type: "synced"
        }
    }

    // Remove surrounding [ ... ] if present
    const inner = trimmedTrack.replaceAll(/^\s*\[\s*|\s*]\s*$/g, "");

    // Extract counts by keyword; order-independent
    const aheadMatch = inner.match(/\bahead\s+(\d+)\b/i);
    const behindMatch = inner.match(/\bbehind\s+(\d+)\b/i);

    const ahead = aheadMatch ? Number(aheadMatch[1]) : 0;
    const behind = behindMatch ? Number(behindMatch[1]) : 0;

    if (ahead === 0 && behind === 0) {
        return {
            type: "synced",
        }
    }

    if (ahead > 0 && behind === 0) {
        return {
            ahead,
            type: "ahead",
        };
    }

    if(ahead === 0 && behind > 0) {
        return {
            behind,
            type: "behind",
        };
    }

    if(ahead > 0 && behind > 0) {
        return {
            ahead,
            behind,
            type: "diverged",
        };
    }

    return null;
}
