import { Command } from "@oclif/core";
import isOnlineFn from 'is-online';

import * as LOGGER from "./logging.js";

export async function isOnline(ctx: Command) {
    const isOnline = await isOnlineFn();

    if(!isOnline) {
        LOGGER.fatal(ctx, "No internet connection available.")
    }
}
