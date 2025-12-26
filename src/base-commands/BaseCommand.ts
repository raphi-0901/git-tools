import { Command, Errors, Flags, Interfaces } from '@oclif/core'

import { ERROR_NUMBERS } from '../utils/constants.js'
import * as LOGGER from '../utils/logging.js'
import { createSpinner } from '../utils/spinner.js'
import Timer from '../utils/Timer.js'

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<T['flags'] & typeof BaseCommand['baseFlags']>
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>

export abstract class BaseCommand<T extends typeof Command = typeof Command> extends Command {
    static baseFlags = {
        debug: Flags.boolean({
            description: 'Show debug logs.',
        }),
        yes: Flags.boolean({
            char: 'y',
            description: 'Skip confirmation prompt',
        })
    }
    protected args!: Args<T>
    public abstract readonly configId: string;
    protected flags!: Flags<T>
    public readonly spinner = createSpinner()
    public readonly timer = new Timer()

    async catch(error: unknown) {
        if(!this.needsToLogError(error)) {
            return
        }

        LOGGER.error(this, error as string)
    }

    public async init(): Promise<void> {
        await super.init()

        const { args, flags } = await this.parse(this.ctor)

        this.flags = flags as Flags<T>
        this.args = args as Args<T>
    }

    public abstract run(): Promise<void>;


    private needsToLogError(error: unknown) {
        if(!(error instanceof Errors.ExitError)) {
            return true
        }

        return !ERROR_NUMBERS.has(error.oclif.exit || Number.NaN)
    }
}
