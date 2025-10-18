import { input, select } from "@inquirer/prompts";
import { Command, Flags } from "@oclif/core";
import chalk from "chalk";
import { simpleGit } from "simple-git";

import { AutoCommitConfig } from "../../types/auto-commit-config.js";
import { ChatMessage, LLMChat } from "../../utils/llm-chat.js";
import { loadUserConfig } from "../../utils/user-config.js";

export default class AutoCommitCommand extends Command {
    static description = "Automatically generate commit messages from staged files with feedback loop";
    static flags = {
        instructions: Flags.string({
            char: "i",
            description: "Provide a specific instruction to the model for the commit message",
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(AutoCommitCommand);

        const git = simpleGit();
        const diff = await git.diff(["--cached"]);

        if (diff.trim().length === 0) {
            this.log(chalk.red("❌ No staged files to create a commit message"));
            return;
        }

        const userConfig = await loadUserConfig<Partial<AutoCommitConfig>>(this, "auto-commit");
        if (!userConfig.GROQ_API_KEY) {
            this.log(chalk.yellow("⚠️ No API key found for running this command"));
            return;
        }

        const branchSummary = await git.branch();
        const currentBranch = branchSummary.current;

        const instructions = flags.instructions ?? userConfig.INSTRUCTIONS ?? "Keep it short and conventional";

        const initialMessages: ChatMessage[] = [
            {
                content:
                    "You are an assistant that generates concise, clear Git commit messages. Only output the commit message itself.",
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
        ];

        const chat = new LLMChat(userConfig.GROQ_API_KEY, initialMessages);

        let finished = false;
        let commitMessage = "";

        /* eslint-disable no-await-in-loop */
        while (!finished) {
            commitMessage = await chat.generate();

            if (!commitMessage) {
                this.error(chalk.red("❌ No commit message received from Groq API"));
                return;
            }

            this.log(chalk.blue("\n🤖 Suggested commit message:"));
            this.log(`   ${chalk.green(commitMessage)}\n`);

            const decision = await select({
                choices: [
                    { name: "✅ Accept and commit", value: "accept" },
                    { name: "✍️ Edit manually", value: "edit" },
                    { name: "🔁 Provide feedback", value: "feedback" },
                    { name: "❌ Cancel", value: "cancel" },
                ],
                message: "What would you like to do?",
            });

            switch (decision) {
                case "accept": {
                    await git.commit(commitMessage);
                    this.log(chalk.green("✅ Commit executed!"));
                    finished = true;
                    break;
                }

                case "cancel": {
                    this.log(chalk.red("🚫 Commit cancelled."));
                    finished = true;
                    break;
                }

                case "edit": {
                    const userEdit = await input({
                        default: commitMessage,
                        message: "Enter your custom commit message:",
                    });
                    await git.commit(userEdit);
                    this.log(chalk.green("✅ Commit executed with custom message!"));
                    finished = true;
                    break;
                }

                case "feedback": {
                    const feedback = await input({
                        message: "Provide your feedback for the LLM:",
                    });
                    chat.addMessage(feedback, "user");
                    break;
                }
            }
        }
        /* eslint-enable no-await-in-loop */
    }
}
