import { input, select } from "@inquirer/prompts";
import { Command, Errors, Flags, Interfaces } from "@oclif/core";
import chalk from "chalk";
import { simpleGit } from "simple-git";

import { renderCommitMessageInput } from "../../ui/CommitMessageInputHelper.js";
import { checkIfFilesStaged } from "../../utils/check-if-files-staged.js";
import { FATAL_ERROR_NUMBER } from "../../utils/constants.js";
import { createSpinner } from "../../utils/create-spinner.js";
import { fitDiffsWithinTokenLimit } from "../../utils/fit-diffs-within-token-limit.js";
import { getRemainingTokensOfLLMChat } from "../../utils/get-remaining-token-of-llm-chat.js";
import { countTokens } from "../../utils/gpt-tokenizer.js";
import { isOnline } from "../../utils/is-online.js";
import { ChatMessage, LLMChat } from "../../utils/llm-chat.js";
import * as LOGGER from "../../utils/logging.js";
import { promptForValue } from "../../utils/prompt-for-value.js";
import { saveGatheredSettings } from "../../utils/save-gathered-settings.js";
import { loadMergedUserConfig } from "../../utils/user-config.js";
import { AutoCommitConfigSchema, AutoCommitUpdateConfig } from "../../zod-schema/auto-commit-config.js";

type AutoCommitFlags = Interfaces.InferredFlags<typeof AutoCommitCommand["flags"]>;

export default class AutoCommitCommand extends Command {
    static description = "Automatically generate commit messages from staged files with feedback loop";
    static flags = {
        instructions: Flags.string({
            char: "i",
            description: "Provide a specific instruction to the model for the commit message",
        }),
        stripDiff: Flags.boolean({
            char: "s",
            description: "Strips diffs.",
        }),
    };
    public readonly commandId = "auto-commit";
    public readonly spinner = createSpinner();

    async catch(error: unknown) {
        LOGGER.error(this, error as string)

        // skip errors already logged by LOGGER.fatal
        if(error instanceof Errors.ExitError && error.oclif.exit === FATAL_ERROR_NUMBER) {
            return;
        }

        this.log(chalk.red("🚫 Commit cancelled."));
    }

    async getDiff(remainingTokens: number) {
        const git = simpleGit();

        const stagedFiles = (await git.diff(["--cached", "--name-only"]))
            .split("\n")
            .filter(Boolean)

        // should never happen, but just in case
        if (stagedFiles.length === 0) {
            return "";
        }

        /**
            Files which have a pattern which is very likely to be relevant for the commit message, such as generated files, lock files, etc.
         */
        const ignoredFiles = stagedFiles.filter(file => !this.shouldIncludeFile(file));
        const ignoredFilesDiffStats = await Promise.all(ignoredFiles.map(file =>  git.diff(["--cached", "--stat", file])))

        /**
         * Files which are investigated further
         */
        const includedFiles = stagedFiles.filter(file => this.shouldIncludeFile(file));
        const includedBlankLinesDiffs = await Promise.all(includedFiles.map(async file => ({
            diff: await git.diff(["--cached", "-w", "--ignore-blank-lines", file]),
            file
        })))

        // filter out files which have no syntactical changes
        const relevantDiffs = includedBlankLinesDiffs.filter(item => item.diff.trim() !== "")
        const nonSyntacticalDiffs = includedBlankLinesDiffs.filter(item => item.diff.trim() === "")

        // if there are just spaces as changes, we should not generate a commit message just based on the file name
        if(relevantDiffs.length === 0) {
            // TODO wrap in fitDiffsInLLM function
            return `The following files have no syntactic changes:\n${nonSyntacticalDiffs.map(item => item.file).join(", ")}`
        }

        return fitDiffsWithinTokenLimit([
            relevantDiffs.map(item => item.diff),
            [
                "The following files have no syntactic changes:\n",
                ...nonSyntacticalDiffs.map(item => item.file)
            ],
            [
              "The following files are ignored because they are likely to be generated or lock files:\n",
                ...ignoredFilesDiffStats,
            ]
        ], remainingTokens)
            .join("\n")
    }

    async run(): Promise<void> {
        const { flags } = await this.parse(AutoCommitCommand);

        // Use the helper to render TextBox and get user input
        // try {
        //     const result = await renderCommitMessageInput();
        //
        //     console.log(result);
        // }
        //     catch (error) {
        //     this.log("TextBox error:", error);
        // }

        const filesStaged = await checkIfFilesStaged();
        if(!filesStaged) {
            LOGGER.fatal(this, "No staged files to create a commit message.");
        }

        const { askForSavingSettings, finalGroqApiKey, finalInstructions } = await this.getFinalConfig(flags);
        await isOnline(this)

        this.spinner.text = "Analyzing staged files for commit message generation..."
        this.spinner.start();

        const remainingTokensForLLM = await getRemainingTokensOfLLMChat({
            apiKey: finalGroqApiKey,
        });

        const initialMessages = await this.buildInitialMessages(finalInstructions)

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const tokensOfInitialMessages = countTokens(initialMessages)

        // fit diff into token limit
        const diff = await this.getDiff(remainingTokensForLLM - tokensOfInitialMessages);

        initialMessages.push({
            content: diff,
            role: "user",
        })

        const chat = new LLMChat(finalGroqApiKey,initialMessages);

        let finished = false;
        let commitMessage = "";
        while (!finished) {
            this.spinner.text = "Generating commit message from staged files...";
            this.spinner.start()
            commitMessage = await chat.generate();

            this.spinner.stop()

            if (!commitMessage) {
                LOGGER.fatal(this, "No commit message received from Groq API");
            }

            finished = await this.handleUserDecision(commitMessage, chat);
        }

        const s = await renderCommitMessageInput();
        console.log('s :>>', s);

        if (!askForSavingSettings) {
            return;
        }

        await saveGatheredSettings(this, this.commandId, {
            GROQ_API_KEY: finalGroqApiKey,
            INSTRUCTIONS: finalInstructions,
        })
    }

    shouldIncludeFile(file: string, ignorePatterns: string[] = [
        "package-lock.json",
        "pnpm-lock.yaml",
        "yarn.lock",
        "*.lock",
        "*.min.js",
        "dist/**",
        "build/**",
        "node_modules/**",
    ]) {
        return !ignorePatterns.some(pattern => {
            if (pattern.includes("*")) {
                const regex = new RegExp("^" + pattern.replaceAll('**', ".*").replaceAll('*', "[^/]*") + "$");
                return regex.test(file);
            }

            return file === pattern;
        });
    }

    private async buildInitialMessages(instructions: string) {
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
                `,
                role: "user",
            },
        ] as ChatMessage[];
    }

    /**
     * Filters a git diff for LLM input to minimize tokens:
     * - Keeps changed lines (+/-) and limited context
     * - Keeps @@ lines but strips the position info (only keeps trailing context)
     * - Removes index, binary, and other metadata lines
     * - Keeps file headers (diff --git)
     */
    private filterDiffForLLM(diff: string): string {
        const lines = diff.split("\n");
        const keep: string[] = [];
        const contextRadius = 2;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Skip other metadata
            if (/^(index|Binary files|old mode|new mode)/.test(line)) {
                continue;
            }

            // Keep file headers
            if (line.startsWith('diff --git ')) {
                keep.push(line);
                continue;
            }

            // Handle @@ lines: keep only context text after them
            if (line.startsWith('@@')) {
                const cleaned = line.replace(/^@@.*@@ ?/, "").trim();
                if (cleaned.length > 0) {
                    keep.push(cleaned);
                }

                continue;
            }

            // Keep modified lines and a few context ones
            if (/^[+-]/.test(line)) {
                if(line.startsWith('+++') || line.startsWith('---')) {
                    continue;
                }

                const start = Math.max(0, i - contextRadius);
                const end = Math.min(lines.length, i + contextRadius + 1);
                for (let j = start; j < end; j++) {
                    const neighbor = lines[j];
                    if (/^(index|@@|Binary files|old mode|new mode)/.test(neighbor)) {
                        continue
                    }

                    if (!keep.includes(neighbor)) {
                        keep.push(neighbor);
                    }
                }
            }
        }

        return keep.join("\n").trim();
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
            finalGroqApiKey = await promptForValue({ key: 'GROQ_API_KEY', schema: AutoCommitConfigSchema.shape.GROQ_API_KEY })
            askForSavingSettings = true;
        }

        let finalInstructions = flags.instructions ?? userConfig.INSTRUCTIONS;
        if (!finalInstructions) {
            LOGGER.warn(this, "No INSTRUCTIONS set in your config.");
            finalInstructions = await promptForValue({ currentValue: "Keep it short and conventional", key: 'INSTRUCTIONS', schema: AutoCommitConfigSchema.shape.INSTRUCTIONS })
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
                const [firstLine, rest] = this.transformGeneratedCommitMessage(commitMessage);
                try {

                const result = await renderCommitMessageInput({
                    description: rest.split("\n"),
                    message: firstLine
                });
                    if(!result) {
                        LOGGER.fatal(this, "No commit message received from TextBox.");
                    }

                    await git.commit([result.message, ...result.description]);
                    this.log(chalk.green("✅ Commit executed with custom message!"));

                } catch(error) {
                    LOGGER.error(this, error as string)
                }


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
