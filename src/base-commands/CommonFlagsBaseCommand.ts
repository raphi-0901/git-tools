import { Command, Flags, Interfaces } from "@oclif/core";

import { BaseCommand } from "./BaseCommand.js";

export type FlagsType<T extends typeof Command> = Interfaces.InferredFlags<T["flags"] & typeof CommonFlagsBaseCommand['baseFlags']>;

export abstract class CommonFlagsBaseCommand<T extends typeof Command = typeof Command> extends BaseCommand<T> {
    static baseFlags = {
        debug: Flags.boolean({
            description: "Show debug logs.",
        }),
        yes: Flags.boolean({
            char: "y",
            description: "Skip confirmation prompt",
        }),
    };
    declare protected flags: FlagsType<T>;

    async init(): Promise<void> {
        await super.init();

        const { flags } = await this.parse(this.ctor);
        this.flags = flags as FlagsType<T>;
    }
}
