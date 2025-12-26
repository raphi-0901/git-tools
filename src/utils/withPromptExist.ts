import { Command } from '@oclif/core'

import { SIGINT_ERROR_NUMBER } from './constants.js'

export async function withPromptExit<T>(
    ctx: Command,
    fn: () => Promise<null | T>
): Promise<T> {
    const result = await fn()

    if (result === null) {
        ctx.exit(SIGINT_ERROR_NUMBER)
    }

    return result
}
