import { getSimpleGit } from './getSimpleGit.js'

export async function checkIfFilesStaged() {
    const git = getSimpleGit()
    const diff = await git.diff([ '--cached'])

    return diff.trim().length > 0
}
