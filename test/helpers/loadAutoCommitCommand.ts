import esmock from "esmock";
import { type SinonStub, stub } from "sinon";

type ModuleExports = Record<string, unknown>;
export type EsmockMocks = Record<string, ModuleExports>;

export type CommandCtor<T> = new (argv: string[], config: unknown) => T;

export async function loadAutoCommitCommand<TCommand>(
    overrides: EsmockMocks = {}
): Promise<{
    Command: CommandCtor<TCommand>;
    stubs: {
        commitStub: SinonStub;
        fakeGit: {
            branch: SinonStub;
            commit: SinonStub;
        };
        fatal: SinonStub;
    };
}> {
    const commitStub = stub().resolves();

    // fake git instance returned by getSimpleGit()
    const fakeGit = {
        branch: stub().resolves({ current: "feature/ABC-123-test" }),
        commit: commitStub,
    };

    // fake chat instance
    class FakeLLMChat {
        remainingTokens = 1000;

        addMessage() {}

        async generate() {
            return "feat: add awesome thing";
        }
    }

    // mock LOGGER.fatal to throw so tests can detect failures
    const fatal = stub().callsFake((_cmd: unknown, msg: string) => {
        throw new Error(msg);
    });

    const Command = (await esmock(
        "../../src/commands/auto-commit/index.js",
        {
            "../../src/utils/branchBackground.js": { getBranchBackground: stub().resolves(null) },
            "../../src/utils/checkIfFilesStaged.js": { checkIfFilesStaged: stub().resolves(true) },
            "../../src/utils/checkIfInGitRepository.js": { checkIfInGitRepository: stub().resolves() },
            "../../src/utils/config/saveGatheredSettings.js": { saveGatheredSettings: stub().resolves() },
            "../../src/utils/config/userConfigHelpers.js": {
                loadMergedUserConfig: stub().resolves({
                    EXAMPLES: ["feat: something"],
                    GROQ_API_KEY: "k",
                    INSTRUCTIONS: "Keep it short",
                }),
            },
            "../../src/utils/diffAnalyzer.js": { diffAnalyzer: stub().resolves("diff --git a/x b/x\n+hi") },
            "../../src/utils/getSimpleGit.js": { getSimpleGit: () => fakeGit },
            "../../src/utils/gptTokenizer.js": { countTokens: stub().returns(10) },
            "../../src/utils/isOnline.js": { isOnline: stub().resolves() },
            "../../src/utils/LLMChat.js": { LLMChat: FakeLLMChat },
            "../../src/utils/logging.js": { debug: stub(), fatal, warn: stub() },
            "../../src/utils/obtainValidGroqApiKey.js": {
                obtainValidGroqApiKey: stub().resolves({ groqApiKey: "k", remainingTokensForLLM: 4000 }),
            },

            // allow per-test overrides
            ...overrides,
        }
    )).default as CommandCtor<TCommand>;

    return {
        Command,
        stubs: {
            commitStub,
            fakeGit,
            fatal,
        },
    };
}
