/**
 * Regular expression patterns identifying protected Git branches.
 *
 * Branches matching any of these patterns are considered critical
 * (e.g. main, develop, release/*, hotfix/*) and should typically be
 * protected from deletion or unsafe operations.
 */
const protectedBranchPatterns = [
    /^main$/,
    /^master$/,
    /^development$/,
    /^develop$/,
    /^release\//,
    /^hotfix\//,
];

/**
 * Checks whether a branch name matches any protected branch pattern.
 *
 * @param branch - The branch name to test (e.g. `"main"` or `"release/1.2"`)
 * @returns `true` if the branch is protected, otherwise `false`
 */
export function isProtectedBranch(branch: string): boolean {
    return protectedBranchPatterns.some((r) => r.test(branch));
}
