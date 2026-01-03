import { Command } from "@oclif/core";

import { SIGINT_ERROR_NUMBER } from "./constants.js";

/**
 * Wraps a prompt or async function that may return `null`, and exits the CLI
 * if the result is `null` (e.g., the user pressed Ctrl+C or cancelled input).
 *
 * @template T The expected return type of the wrapped function.
 * @param ctx The command context used for logging and exiting.
 * @param fn An async function that returns a value of type `T` or `null`.
 * @returns A promise that resolves to the value returned by `fn` if not `null`.
 * @throws Exits the process with `SIGINT_ERROR_NUMBER` if `fn` returns `null`.
 */
export async function withPromptExit<T>(
    ctx: Command,
    fn: () => Promise<null | T>
): Promise<T> {
    const result = await fn();

    if (result === null) {
        ctx.log("")
        ctx.exit(SIGINT_ERROR_NUMBER);
    }

    return result;
}
