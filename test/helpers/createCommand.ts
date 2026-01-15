import { type SinonStub, stub } from "sinon";

import { CommandCtor } from "./loadAutoCommitCommand.js";

export type TestShims<TFlags> = {
    flags: TFlags;
    log: SinonStub;
    run(): Promise<unknown>;
    spinner: { start: SinonStub; stop: SinonStub; text: string };
    timer: { start: SinonStub; stop: SinonStub };
};

export function createCommand<TFlags, TCommand extends TestShims<TFlags>>(
    Command: CommandCtor<TCommand>,
    flags: TFlags
): TCommand {
    const cmd = new Command([], {}) as TCommand;

    cmd.flags = flags;
    cmd.timer = { start: stub(), stop: stub().returns("1ms") };
    cmd.spinner = { start: stub(), stop: stub(), text: "" };
    cmd.log = stub();

    return cmd;
}
