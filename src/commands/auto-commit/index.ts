import { input, select } from "@inquirer/prompts";
import {Command, Errors, Flags, Interfaces} from "@oclif/core";
import chalk from "chalk";
import { simpleGit } from "simple-git";

import {FATAL_ERROR_NUMBER} from "../../utils/constants.js";
import {createSpinner} from "../../utils/create-spinner.js";
import { ChatMessage, LLMChat } from "../../utils/llm-chat.js";
import * as LOGGER from "../../utils/logging.js";
import {promptForValue} from "../../utils/prompt-for-value.js";
import {saveGatheredSettings} from "../../utils/save-gathered-settings.js";
import { loadMergedUserConfig } from "../../utils/user-config.js";
import {AutoCommitConfigSchema, AutoCommitUpdateConfig} from "../../zod-schema/auto-commit-config.js";

type AutoCommitFlags = Interfaces.InferredFlags<typeof AutoCommitCommand["flags"]>;

export default class AutoCommitCommand extends Command {
    static description = "Automatically generate commit messages from staged files with feedback loop";
    static flags = {
        instructions: Flags.string({
            char: "i",
            description: "Provide a specific instruction to the model for the commit message",
        }),
    };
    public readonly commandId = "auto-commit";

    async catch(error: unknown) {
        // skip errors already logged by LOGGER.fatal
        if(error instanceof Errors.ExitError && error.oclif.exit === FATAL_ERROR_NUMBER) {
            return;
        }

        this.log(chalk.red("🚫 Commit cancelled."));
    }

    async run(): Promise<void> {
        const { flags } = await this.parse(AutoCommitCommand);

        const git = simpleGit();
        const diff = await git.diff(["--cached"]);

        if (diff.trim().length === 0) {
            this.log(chalk.red("❌ No staged files to create a commit message"));
            return;
        }

        const { askForSavingSettings, finalGroqApiKey, finalInstructions } = await this.getFinalConfig(flags);

        const spinner = createSpinner({
            text: "Analyzing staged files for commit message generation...",
        }).start();


        const chat = new LLMChat(finalGroqApiKey, await this.buildInitialMessages(finalInstructions, diff));
        let finished = false;
        let commitMessage = "";
        while (!finished) {
            spinner.text = "Generating commit message from staged files...";
            spinner.start()
            commitMessage = await chat.generate();
            spinner.stop()

            if (!commitMessage) {
                this.error(chalk.red("❌ No commit message received from Groq API"));
            }

            finished = await this.handleUserDecision(commitMessage, chat);
        }

        if (!askForSavingSettings) {
            return;
        }

        await saveGatheredSettings(this, this.commandId, {
            GROQ_API_KEY: finalGroqApiKey,
            INSTRUCTIONS: finalInstructions,
        })
    }

    private async buildInitialMessages(instructions: string, diff: string) {
        const git = simpleGit();
        const branchSummary = await git.branch();
        const currentBranch = branchSummary.current;

        return [
            {
                content:
                    "You are an assistant that generates concise, clear Git commit messages. Only output the commit message itself and never ask any questions. If the user provides non useful instructions, only depend on the staged files and the current branch.",
                role: "system",
            },
            {
                content: `
Create a commit message using the following instructions and information.
User Instructions: "${instructions}"
Current Branch: "${currentBranch}"
Diffs of Staged Files:
${diff}
                `,
                role: "user",
            },
        ] as ChatMessage[];
    }

    private async getFinalConfig(flags: AutoCommitFlags) {
        // const finalConfig: AutoCommitUpdateConfig = {}
        // let askForSavingSettings = false;
        // for (const [key, fieldSchema] of Object.entries(AutoCommitConfigSchema.shape)) {
        //     let currentValue = userConfig[key as keyof AutoCommitUpdateConfig]
        //     if(!currentValue) {
        //         currentValue = await promptForValue({
        //             key,
        //             schema: fieldSchema,
        //         })
        //         askForSavingSettings = true;
        //     }
        //
        //     finalConfig[key as keyof AutoCommitUpdateConfig] = currentValue
        // }
        const userConfig = await loadMergedUserConfig<AutoCommitUpdateConfig>(this, this.commandId);

        let askForSavingSettings = false;
        let finalGroqApiKey = userConfig.GROQ_API_KEY;
        if (!finalGroqApiKey) {
            LOGGER.warn(this, "No GROQ_API_KEY set in your config.");
            finalGroqApiKey = await promptForValue({key: 'GROQ_API_KEY', schema: AutoCommitConfigSchema.shape.GROQ_API_KEY})
            askForSavingSettings = true;
        }

        let finalInstructions = flags.instructions ?? userConfig.INSTRUCTIONS;
        if (!finalInstructions) {
            LOGGER.warn(this, "No INSTRUCTIONS set in your config.");
            finalInstructions = await promptForValue({currentValue: "Keep it short and conventional", key: 'INSTRUCTIONS', schema: AutoCommitConfigSchema.shape.INSTRUCTIONS})
            askForSavingSettings = true;
        }

        return {
            askForSavingSettings,
            finalGroqApiKey,
            finalInstructions,
        }
    }

    private async handleUserDecision(commitMessage: string, chat: LLMChat) {
        const git = simpleGit();
        this.log(chalk.blue("\n🤖 Suggested commit message:"));
        this.log(`   ${chalk.green(commitMessage)}\n`);

        const decision = await select({
            choices: [
                { name: "✅ Accept and commit", value: "accept" },
                { name: "✍️ Edit manually", value: "edit" },
                { name: "🔁 Provide feedback", value: "feedback" },
                { name: "❌ Cancel", value: "cancel" },
            ] as const,
            message: "What would you like to do?",
        })

        switch (decision) {
            case "accept": {
                await git.commit(this.transformGeneratedCommitMessage(commitMessage));
                this.log(chalk.green("✅ Commit executed!"));
                return true;
            }

            case "cancel": {
                this.log(chalk.red("🚫 Commit cancelled."));
                return true;
            }

            case "edit": {
                const userEdit = await input({
                    default: commitMessage,
                    message: "Enter your custom commit message:",
                })

                await git.commit(this.transformGeneratedCommitMessage(userEdit));
                this.log(chalk.green("✅ Commit executed with custom message!"));
                return true;
            }

            case "feedback": {
                const feedback = await input({
                    message: "Provide your feedback for the LLM:",
                });
                chat.addMessage(feedback, "user");
                return false;
            }

            default: {
                return true;
            }
        }
    }

    private transformGeneratedCommitMessage(commitMessage: string) {
        const indexOfLineBreak = commitMessage.indexOf("\n");
        if(indexOfLineBreak === -1) {
            return commitMessage;
        }

        const firstLine = commitMessage.slice(0, Math.max(0, indexOfLineBreak)).trim();
        const rest = commitMessage.slice(Math.max(0, indexOfLineBreak + 1)).trim();

        return [firstLine, rest]
    }
}
