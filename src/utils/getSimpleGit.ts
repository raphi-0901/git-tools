import { simpleGit, type SimpleGit } from "simple-git";

let gitInstance: null | SimpleGit = null;

export function getSimpleGit(): SimpleGit {
    if (!gitInstance) {
        gitInstance = simpleGit()
    }

    return gitInstance;
}
