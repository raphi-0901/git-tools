import isOnlineFn from 'is-online'

import { BaseCommand } from '../base-commands/BaseCommand.js'
import * as LOGGER from './logging.js'

export async function isOnline(ctx: BaseCommand) {
    const isOnline = await isOnlineFn()

    if(!isOnline) {
        LOGGER.fatal(ctx, 'No internet connection available.')
    }
}
