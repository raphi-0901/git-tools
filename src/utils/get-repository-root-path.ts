import {simpleGit} from "simple-git";

export function getRepositoryRootPath() {
    const git = simpleGit();

    return git.revparse(["--show-toplevel"]);
}
