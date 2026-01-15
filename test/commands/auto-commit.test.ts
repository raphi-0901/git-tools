import { expect } from "chai";

import { createCommand, type TestShims } from "../helpers/createCommand.js";
import { loadAutoCommitCommand } from "../helpers/loadAutoCommitCommand.js";

type AutoCommitFlags = { reword?: boolean; yes?: boolean };
type AutoCommitInstance = TestShims<AutoCommitFlags>;

describe("AutoCommitCommand", () => {
    it("generates commit message and commits when --yes", async () => {
        const { Command, stubs } = await loadAutoCommitCommand<AutoCommitInstance>();
        const cmd: AutoCommitInstance = createCommand(Command, { yes: true });

        await cmd.run();

        expect(stubs.commitStub.calledOnce).to.equal(true);
        expect(stubs.commitStub.firstCall.args[0]).to.equal("feat: add awesome thing");
    });
});
