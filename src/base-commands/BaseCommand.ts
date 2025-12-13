import { Command, Errors } from "@oclif/core";

import { FATAL_ERROR_NUMBER } from "../utils/constants.js";
import * as LOGGER from "../utils/logging.js";
import { createSpinner } from "../utils/spinner.js";
import Timer from "../utils/Timer.js";

export abstract class BaseCommand extends Command {
    public abstract readonly commandId: string;
    public abstract readonly configId: string;
    public readonly spinner = createSpinner();
    public readonly timer = new Timer()

    async catch(error: unknown) {
        // skip errors already logged by LOGGER.fatal
        if(error instanceof Errors.ExitError && error.oclif.exit === FATAL_ERROR_NUMBER) {
            return;
        }

        LOGGER.error(this, error as string)
    }

    public abstract run(): Promise<void>;
}
