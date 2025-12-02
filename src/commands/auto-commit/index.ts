import { Command, Errors, Flags, Interfaces } from "@oclif/core";
import chalk from "chalk";
import { simpleGit } from "simple-git";

import { renderCommitMessageInput } from "../../ui/CommitMessageInput.js";
import { renderSelectInput } from "../../ui/SelectInput.js";
import { renderTextInput } from "../../ui/TextInput.js";
import { checkIfFilesStaged } from "../../utils/check-if-files-staged.js";
import { FATAL_ERROR_NUMBER, SIGINT_ERROR_NUMBER } from "../../utils/constants.js";
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
        if (error instanceof Errors.ExitError && error.oclif.exit === FATAL_ERROR_NUMBER) {
            return;
        }

        this.log(chalk.red("🚫 Commit cancelled."));
    }

    async diffFilesPerType() {
        const git = simpleGit();

        const stagedFiles = new Set(
            (await git.diff(["--cached", "--name-only"]))
                .split("\n")
                .filter(Boolean)
        )

        // should never happen, but just in case
        if (stagedFiles.size === 0) {
            return {
                deletedFiles: new Set<string>(),
                ignoredFiles: new Set<string>(),
                nonSyntacticChangesFiles: new Set<string>(),
                relevantFiles: new Set<string>(),
            };
        }

        const deletedFiles = new Set(
            (await git.diff(["--cached", "--diff-filter=D", "--name-only"]))
                .split("\n")
                .filter(Boolean)
        )
        const nonDeletedStagedFiles = stagedFiles.difference(deletedFiles);

        /**
         Files which have a pattern which is very likely to be relevant for the commit message, such as generated files, lock files, etc.
         */
        const ignoredFiles = new Set(nonDeletedStagedFiles.values()
            .filter(file => !this.shouldIncludeFile(file))
            .toArray()
        );

        /**
         * Files which are investigated further
         */
        const includedFiles = nonDeletedStagedFiles.difference(ignoredFiles)

        const includedBlankLinesDiffs = await Promise.all([...includedFiles].map(async file => ({
            diff: await git.diff(["--cached", "-w", "--ignore-blank-lines", file]),
            file
        })))

        const relevantFiles = new Set<string>()
        const nonSyntacticChangesFiles = new Set<string>()
        for (const { diff, file } of includedBlankLinesDiffs) {
            if (diff.trim() === "") {
                nonSyntacticChangesFiles.add(file)
            } else {
                relevantFiles.add(file)
            }
        }

        return {
            deletedFiles,
            ignoredFiles,
            nonSyntacticChangesFiles,
            relevantFiles,
        }
    }

    async getDiff(remainingTokens: number) {
        const INCLUDE_MAXIMAL_FILE_COUNT = 5;
        const git = simpleGit();
        const { deletedFiles, ignoredFiles, nonSyntacticChangesFiles, relevantFiles } = await this.diffFilesPerType()

        const messageParts: string[][] = []
        if (relevantFiles.size > 0) {
            const relevantDiffs = await Promise.all(relevantFiles.values().map(file => git.diff(["--cached", "-w", "--ignore-blank-lines", file])))
            const filteredDiffs = relevantDiffs.map((diff, index) => `${"\n".repeat(Math.min(1, index))}${this.filterDiffForLLM(diff)}`)
            messageParts.push([
                "Diffs:",
                ...filteredDiffs
            ])
        }

        if (deletedFiles.size > 0) {
            const message = [
                "\n\nFiles which got deleted:",
                ...deletedFiles.values().toArray(),
            ]

            messageParts.push(message)
        }

        if (nonSyntacticChangesFiles.size > 0) {
            const nonSyntacticalDiffs = await Promise.all(nonSyntacticChangesFiles.values().take(INCLUDE_MAXIMAL_FILE_COUNT).map(file => git.diff(["--cached", file])))
            const message = [
                "\n\nFiles with non syntactic changes:",
                nonSyntacticalDiffs.join("\n")
            ]

            if (nonSyntacticChangesFiles.size > INCLUDE_MAXIMAL_FILE_COUNT) {
                message.push(`...and ${nonSyntacticChangesFiles.size - INCLUDE_MAXIMAL_FILE_COUNT} more.`)
            }

            messageParts.push(message)
        }

        if (ignoredFiles.size > 0) {
            const ignoredFilesDiffStats = await Promise.all(ignoredFiles.values().take(INCLUDE_MAXIMAL_FILE_COUNT).map(file => git.diff(["--cached", "--stat", file])))
            const message = [
                "\n\nFiles that are ignored because they are likely to be generated or lock files:",
                ignoredFilesDiffStats.join("\n"),
            ]

            if (ignoredFiles.size > INCLUDE_MAXIMAL_FILE_COUNT) {
                message.push(`...and ${ignoredFiles.size - INCLUDE_MAXIMAL_FILE_COUNT} more.`)
            }

            messageParts.push(message)
        }

        return fitDiffsWithinTokenLimit(messageParts, remainingTokens).join("\n").trim()
    }

    async run(): Promise<void> {
        const { flags } = await this.parse(AutoCommitCommand);

        const filesStaged = await checkIfFilesStaged();
        if (!filesStaged) {
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

        const chat = new LLMChat(finalGroqApiKey, initialMessages);

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
                    "You are an assistant that generates concise, clear Git commit messages. Always answer with the output of the commit message itself and never ask any questions. If the user provides non useful instructions, only depend on the staged files and the current branch.",
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
                if (line.startsWith('+++') || line.startsWith('---')) {
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

            const promptedGroqApiKey = await promptForValue({
                key: 'GROQ_API_KEY',
                schema: AutoCommitConfigSchema.shape.GROQ_API_KEY
            })
            if (!promptedGroqApiKey) {
                LOGGER.fatal(this, "No GROQ_API_KEY received from TextBox.");
            }

            finalGroqApiKey = promptedGroqApiKey;
            askForSavingSettings = true;
        }

        let finalInstructions = flags.instructions ?? userConfig.INSTRUCTIONS;
        if (!finalInstructions) {
            LOGGER.warn(this, "No INSTRUCTIONS set in your config.");

            const promptedFinalInstructions = await promptForValue({
                currentValue: "Keep it short and conventional",
                key: 'INSTRUCTIONS',
                schema: AutoCommitConfigSchema.shape.INSTRUCTIONS
            })
            if (!promptedFinalInstructions) {
                LOGGER.fatal(this, "No GROQ_API_KEY received from TextBox.");
            }

            finalInstructions = promptedFinalInstructions
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

        const decision = await renderSelectInput({
            items: [
                { label: "\u{1F680} Accept and commit", value: "accept" },
                { label: "\u{21AA} Edit manually", value: "edit" },
                { label: "\u{1F501} Provide feedback", value: "feedback" },
                { label: "\u{1F6AB} Cancel", value: "cancel" },
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
                const result = await renderCommitMessageInput({
                    defaultValues: {
                        description: rest?.split("\n") || [],
                        message: firstLine
                    },
                    message: "Manually edit the commit message:"
                });

                if (result === null) {
                    this.exit(SIGINT_ERROR_NUMBER)
                }

                await git.commit([result.message, ...result.description]);
                this.log(chalk.green("✅ Commit executed with custom message!"));

                return true;
            }

            case "feedback": {
                const feedback = await renderTextInput({
                    message: "Provide your feedback for the LLM:",
                    validate(input) {
                        if(input.trim() === "") {
                            return "Feedback cannot be empty."
                        }

                        return true;
                    }
                });

                if (feedback === null) {
                    this.exit(SIGINT_ERROR_NUMBER)
                }

                chat.addMessage(feedback, "user");
                return false;
            }

            // means user pressed ctrl+c
            case null: {
                this.exit(SIGINT_ERROR_NUMBER);
            }
        }
    }

    private transformGeneratedCommitMessage(commitMessage: string): [string, string] | [string] {
        const indexOfLineBreak = commitMessage.indexOf("\n");
        if (indexOfLineBreak === -1) {
            return [commitMessage];
        }

        const firstLine = commitMessage.slice(0, indexOfLineBreak).trim();
        const rest = commitMessage.slice(indexOfLineBreak + 1).trim();

        return [firstLine, rest]
    }
}
