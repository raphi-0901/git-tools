/**
 * Calculates an importance score for a Git branch based on its name
 * and recent activity.
 *
 * Well-known branch types (e.g. `main`, `develop`, `release/*`)
 * receive a higher base score. An additional activity score is added
 * depending on how recently the last commit was made.
 *
 * Remote prefixes such as `origin/` are ignored when evaluating the
 * branch name.
 *
 * @param branchName - The branch name (local or remote, e.g. `"main"` or `"origin/release/1.0"`)
 * @param lastCommitDate - Timestamp of the last commit in milliseconds since epoch
 * @returns A numeric importance score; higher means more important
 */
export function calculateBranchImportance(branchName: string, lastCommitDate: number): number {
    let score = 0;
    const normalizedName = branchName.replace(/^origin\//, '');

    if (/^(main|master)$/.test(normalizedName)) {
        score += 1000;
    }
    else if (/^(development|develop)$/.test(normalizedName)) {
        score += 900;
    }
    else if (/^release\//.test(normalizedName)) {
        score += 800;
    }
    else if (/^hotfix\//.test(normalizedName)) {
        score += 700;
    }
    else if (normalizedName.startsWith('staging')) {
        score += 600;
    }
    else if (normalizedName.startsWith('production')) {
        score += 950;
    }

    const daysSinceCommit = (Date.now() - lastCommitDate) / (1000 * 60 * 60 * 24);
    const activityScore = Math.max(0, 100 - daysSinceCommit);

    return score + activityScore;
}
