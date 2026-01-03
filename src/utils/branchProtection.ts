/**
 * Regular expression patterns for branch names that are considered protected.
 *
 * These typically include mainline branches (e.g. main, master, develop)
 * and long-living branches such as release/* and hotfix/*.
 */
export const protectedBranchPatterns: readonly RegExp[] = [
    /^main$/,
    /^master$/,
    /^development$/,
    /^develop$/,
    /^dev/,
    /^release\//,
    /^hotfix\//,
];

/**
 * Checks whether a given branch name is protected.
 *
 * A branch is considered protected if it matches at least one of the provided
 * regular expression patterns.
 *
 * @param branch - The name of the branch to check
 * @param protectedBranches - A list of regular expression patterns defining protected branches
 * @returns `true` if the branch is protected, otherwise `false`
 *
 * @example
 * ```ts
 * isProtectedBranch("main"); // true
 * isProtectedBranch("feature/login"); // false
 * isProtectedBranch("release/1.0.0"); // true
 * ```
 */
export function isProtectedBranch(
    branch: string,
    protectedBranches: readonly RegExp[] | RegExp[] = protectedBranchPatterns
) {
    return protectedBranches.some((r) => r.test(branch));
}
