import isOnlineFn from 'is-online';

import { BaseCommand } from "../base-commands/BaseCommand.js";
import * as LOGGER from "./logging.js";

/**
 * Checks if the system has an active internet connection.
 *
 * If no connection is available, logs a fatal error and exits via the provided context.
 *
 * @param ctx The command context, used for logging and exiting.
 * @returns A promise that resolves when the check is complete.
 */
export async function isOnline(ctx: BaseCommand) {
    const isOnline = await isOnlineFn();

    if (!isOnline) {
        LOGGER.fatal(ctx, "No internet connection available.");
    }
}
