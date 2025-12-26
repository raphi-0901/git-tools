import { getSimpleGit } from './getSimpleGit.js'

export function getRepositoryRootPath() {
    const git = getSimpleGit()

    return git.revparse(['--show-toplevel'])
}
