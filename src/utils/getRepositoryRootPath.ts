import { getSimpleGit } from "./getSimpleGit.js";

/**
 * Retrieves the absolute path to the root of the current git repository.
 *
 * @returns A promise that resolves to the repository root path as a string.
 */
export function getRepositoryRootPath() {
    const git = getSimpleGit();

    return git.revparse(["--show-toplevel"]);
}
