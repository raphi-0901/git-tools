import { simpleGit, type SimpleGit } from "simple-git";

let gitInstance: null | SimpleGit = null;

/**
 * Returns a singleton instance of `SimpleGit` for interacting with the
 * current git repository.
 *
 * @returns The `SimpleGit` instance.
 */
export function getSimpleGit(): SimpleGit {
    if (!gitInstance) {
        gitInstance = simpleGit();
    }

    return gitInstance;
}
