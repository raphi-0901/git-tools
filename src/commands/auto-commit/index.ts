import { Flags } from "@oclif/core";
import chalk from "chalk";

import { CommonFlagsBaseCommand } from "../../base-commands/CommonFlagsBaseCommand.js";
import { IssueSummary } from "../../types/IssueSummary.js";
import { renderCommitMessageInput } from "../../ui/CommitMessageInput.js";
import { renderSelectInput } from "../../ui/SelectInput.js";
import { renderTextInput } from "../../ui/TextInput.js";
import { getBranchBackground } from "../../utils/branchBackground.js";
import { checkIfCommitExists } from "../../utils/checkIfCommitExists.js";
import { checkIfFilesStaged } from "../../utils/checkIfFilesStaged.js";
import { checkIfInGitRepository } from "../../utils/checkIfInGitRepository.js";
import { promptForTextConfigValue } from "../../utils/config/promptForConfigValue.js";
import { saveGatheredSettings } from "../../utils/config/saveGatheredSettings.js";
import { loadMergedUserConfig } from "../../utils/config/userConfigHelpers.js";
import { diffAnalyzer, DiffAnalyzerParams } from "../../utils/diffAnalyzer.js";
import { getSimpleGit } from "../../utils/getSimpleGit.js";
import { countTokens } from "../../utils/gptTokenizer.js";
import { isOnline } from "../../utils/isOnline.js";
import { ChatMessage, LLMChat } from "../../utils/LLMChat.js";
import * as LOGGER from "../../utils/logging.js";
import { obtainValidGroqApiKey } from "../../utils/obtainValidGroqApiKey.js";
import { rewordCommit } from "../../utils/rewordCommitMessage.js";
import { transformGeneratedCommitMessage } from "../../utils/transformGeneratedCommitMessage.js";
import { withPromptExit } from "../../utils/withPromptExist.js";
import { AutoCommitConfigSchema, AutoCommitUpdateConfig } from "../../zod-schema/autoCommitConfig.js";

export default class AutoCommitCommand extends CommonFlagsBaseCommand<typeof AutoCommitCommand> {
    static description = "Automatically generate commit messages from staged files with feedback loop";
    static flags = {
        reword: Flags.string({
            description: "Rewords the commit message of the given commit. The commit hash must be provided.",
        }),
    };
    public readonly configId = "commit";

    async catch(error: unknown) {
        super.catch(error);
        this.log(chalk.red("🚫 Commit cancelled."));
    }

    async run() {
        this.timer.start("total");
        this.timer.start("response");
        await checkIfInGitRepository(this);

        if (this.flags.reword) {
            const commitExists = await checkIfCommitExists(this.flags.reword);
            if (!commitExists) {
                LOGGER.fatal(this, `Commit with hash ${this.flags.reword} does not exist.`);
            }
        } else {
            const filesStaged = await checkIfFilesStaged();
            if (!filesStaged) {
                LOGGER.fatal(this, "No staged files to create a commit message.");
            }
        }

        const finalConfig = await this.getFinalConfig();
        const { askForSavingSettings, finalExamples, finalInstructions } = finalConfig;
        LOGGER.debug(this, `Final config: ${JSON.stringify(finalConfig, null, 2)}`)

        await isOnline(this)
        const {
            groqApiKey: finalGroqApiKey,
            remainingTokensForLLM
        } = await obtainValidGroqApiKey(this, finalConfig.finalGroqApiKey)

        this.spinner.text = "Analyzing staged files for commit message generation..."
        this.spinner.start()

        const branchBackground = await getBranchBackground()

        const initialMessages = await this.buildInitialMessages({
            examples: finalExamples,
            instructions: finalInstructions,
            issue: branchBackground
        })

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const tokensOfInitialMessages = countTokens(initialMessages)
        LOGGER.debug(this, `Initial messages takes ${tokensOfInitialMessages} of ${remainingTokensForLLM} tokens: ${JSON.stringify(initialMessages, null, 2)}`)

        const tokensForDiff = remainingTokensForLLM - tokensOfInitialMessages;
        const diffAnalyzerParams: DiffAnalyzerParams = {
            remainingTokens: tokensForDiff,
            ...(this.flags.reword
                    ? { commitHash: this.flags.reword, type: "reword" }
                    : { type: "commit" }
            )
        };
        const diff = await diffAnalyzer(diffAnalyzerParams);
        LOGGER.debug(this, `Diff takes ${countTokens(diff)} tokens:\n${diff}`)

        // append to first user message
        initialMessages[1].content += "\n\n" + diff

        const chat = new LLMChat(finalGroqApiKey, initialMessages)

        let finished = false;
        let commitMessage = "";
        while (!finished) {
            this.spinner.text = "Generating commit message from staged files...";
            this.spinner.start()

            try {
                commitMessage = await chat.generate();
            } catch (error) {
                LOGGER.fatal(this, "Error while generating commit message: " + error)
            }

            LOGGER.debug(this, `Tokens left: ${chat.remainingTokens}`)
            LOGGER.debug(this, `Time taken: ${this.timer.stop("response")}`)

            this.spinner.stop()

            if (!commitMessage) {
                LOGGER.fatal(this, "No commit message received from Groq API");
            }

            finished = await this.handleUserDecision(commitMessage, chat, this.flags.reword);
            this.timer.start("response")
        }

        LOGGER.debug(this, `Action took ${this.timer.stop("total")}.`)

        if (!askForSavingSettings) {
            return;
        }

        await saveGatheredSettings(this, {
            EXAMPLES: finalExamples,
            GROQ_API_KEY: finalGroqApiKey,
            INSTRUCTIONS: finalInstructions,
        })
    }

    private async buildInitialMessages({
                                           examples,
                                           instructions,
                                           issue,
                                       }: {
        examples: string[],
        instructions: string,
        issue?: IssueSummary | null
    }) {
        const git = getSimpleGit();
        const branchSummary = await git.branch();
        const currentBranch = branchSummary.current;

        return [
            {
                content: `
You are an assistant that generates concise, clear, conventional Git commit messages.

Strict rules:
- ALWAYS output only the commit message itself.
- NEVER ask questions or request clarification.
- NEVER output explanations, meta comments, or additional text.
- A commit message must be short, imperative, and human-readable.
- If the user input is chit-chat, irrelevant, emotional, or non-actionable,
  REPEAT the previous commit message EXACTLY.
- When user instructions are unclear, irrelevant, vague, or unusable,
  ignore them and rely ONLY on:
    (1) the staged file diffs
    (2) the current branch name
    (3) the commit message examples
- NEVER reference the instructions directly in the commit message.
- NEVER invent changes that are not present in the diffs.
- Generate a single concise commit message (one-line summary; optional body only if needed).
`,
                role: "system",
            },
            {
                content: `
User Instructions: "${instructions}"
Current Branch: "${currentBranch}"
${issue
                    ? `
Ticket ID: "${issue.ticketId}"
Ticket Summary: "${issue.summary}"
Ticket Description: "${issue.description}"
`.trim()
                    : ""
                }
${examples.length > 0
                    ? "Examples of good commit messages: \n" + examples.join("\n") + "\n\n"
                    : ""
                }
`,
                role: "user",
            },
        ] as ChatMessage[];
    }

    private async finalizeCommit(commitMessage: string | string[], rewordCommitHash?: string) {
        const git = getSimpleGit();

        await (rewordCommitHash ? rewordCommit(rewordCommitHash, commitMessage) : git.commit(commitMessage));
    }

    private async getFinalConfig() {
        const userConfig = await loadMergedUserConfig<AutoCommitUpdateConfig>(this);

        let askForSavingSettings = false;
        let finalGroqApiKey = userConfig.GROQ_API_KEY;
        if (!finalGroqApiKey) {
            LOGGER.warn(this, "No GROQ_API_KEY set in your config.");
            finalGroqApiKey = await promptForTextConfigValue(this, {
                schema: AutoCommitConfigSchema.shape.GROQ_API_KEY,
            });

            askForSavingSettings = true;
        }

        let finalInstructions = userConfig.INSTRUCTIONS;
        if (!finalInstructions) {
            LOGGER.warn(this, "No INSTRUCTIONS set in your config.");
            finalInstructions = await promptForTextConfigValue(this, {
                currentValue: "Keep it short and conventional",
                schema: AutoCommitConfigSchema.shape.INSTRUCTIONS
            })

            askForSavingSettings = true;
        }

        let finalExamples = userConfig.EXAMPLES;
        if (!finalExamples) {
            LOGGER.warn(this, "No EXAMPLES set in your config.");

            const examples = []
            while (true) {
                const result = await withPromptExit(this, () => renderCommitMessageInput({
                    message: "Provide some examples of commit messages you would like to generate: (leave empty if you don't want to provide any further examples)"
                }))

                if (result.message.trim() === "" && result?.description.join(',').trim() === "") {
                    break;
                }

                const example = `${result?.message}\n${result?.description.join("\n")}`
                examples.push(example)
            }

            finalExamples = examples
            askForSavingSettings = true;
        }


        return {
            askForSavingSettings,
            finalExamples,
            finalGroqApiKey,
            finalInstructions,
        }
    }

    private async handleUserDecision(commitMessage: string, chat: LLMChat, rewordCommitHash?: string) {
        this.log(chalk.blue("\n🤖 Suggested commit message:"));
        this.log(`   ${chalk.green(commitMessage)}\n`);

        const decision = this.flags.yes
            ? "accept"
            : await withPromptExit(this, () => renderSelectInput({
                items: [
                    { label: "\u{1F680} Accept and commit", value: "accept" },
                    { label: "\u{21AA} Edit manually", value: "edit" },
                    { label: "\u{1F501} Provide feedback", value: "feedback" },
                    { label: "\u{1F6AB} Cancel", value: "cancel" },
                ] as const,
                message: "What would you like to do?",
            }))

        switch (decision) {
            case "accept": {
                await this.finalizeCommit(commitMessage, rewordCommitHash)
                this.log(chalk.green("✅ Commit executed!"));
                return true;
            }

            case "cancel": {
                this.log(chalk.red("🚫 Commit cancelled."));
                return true;
            }

            case "edit": {
                const [firstLine, rest] = transformGeneratedCommitMessage(commitMessage);
                const result = await withPromptExit(this, () => renderCommitMessageInput({
                    defaultValues: {
                        description: rest?.split("\n") || [],
                        message: firstLine
                    },
                    message: "Manually edit the commit message:"
                }))

                await this.finalizeCommit([result.message, ...result.description], rewordCommitHash)
                this.log(chalk.green("✅ Commit executed with custom message!"));

                return true;
            }

            case "feedback": {
                const feedback = await withPromptExit(this, () => renderTextInput({
                    message: "Provide your feedback for the LLM:",
                    validate(input) {
                        if (input.trim() === "") {
                            return "Feedback cannot be empty."
                        }

                        return true;
                    }
                }));

                chat.addMessage(feedback, "user");
                return false;
            }
        }
    }
}
