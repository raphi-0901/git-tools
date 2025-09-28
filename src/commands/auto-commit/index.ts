import { input, select } from "@inquirer/prompts";
import { Command, Flags } from "@oclif/core";
import * as OpenAI from "openai";
import { simpleGit } from "simple-git";

import {AutoCommitConfig} from "../../types/auto-commit-config.js";
import { loadUserConfig } from "../../utils/user-config.js";

export default class Index extends Command {
    static description = "Automatically generate commit messages from staged files with feedback loop";
    static flags = {
        instructions: Flags.string({
            char: "i",
            description: "Provide a specific instruction to the model for the commit message",
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(Index);

        const git = simpleGit();
        const diff = await git.diff(["--cached"]);

        if (diff.trim().length === 0) {
            this.warn("❌ No staged files to create a commit message");
            return;
        }

        const userConfig = await loadUserConfig<Partial<AutoCommitConfig>>("auto-commit");
        if(!userConfig.GROQ_API_KEY) {
            this.warn("No API key found for running this command");
            return;
        }

        const branchSummary = await git.branch();
        const currentBranch = branchSummary.current;

        // Use the -i/--instruction flag if provided, otherwise fallback to user config
        const instructions = flags.instructions ?? userConfig.INSTRUCTIONS ?? "Keep it short and conventional";
        const client = new OpenAI.OpenAI({
            apiKey: userConfig.GROQ_API_KEY,
            baseURL: "https://api.groq.com/openai/v1",
        });

        const messages: OpenAI.OpenAI.Chat.ChatCompletionMessageParam[] = [
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

        let finished = false;
        let commitMessage = "";

        /* eslint-disable no-await-in-loop */
        while (!finished) {
            const response = await client.chat.completions.create({
                messages,
                model: "llama-3.3-70b-versatile",
                temperature: 0.4,
            });

            commitMessage = response.choices[0]?.message?.content?.trim() ?? "";
            if (!commitMessage) {
                this.error("❌ No commit message received from Groq API");
                return;
            }

            this.log("\n🤖 Suggested commit message:");
            this.log(`   ${commitMessage}\n`);

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
                    this.log("✅ Commit executed!");
                    finished = true;
                    break;
                }

                case "cancel": {
                    this.log("🚫 Commit cancelled.");
                    finished = true;
                    break;
                }

                case "edit": {
                    const userEdit = await input({
                        default: commitMessage,
                        message: "Enter your custom commit message:",
                    });
                    await git.commit(userEdit);
                    this.log("✅ Commit executed with custom message!");
                    finished = true;
                    break;
                }

                case "feedback": {
                    const fb = await input({
                        message: "Provide your feedback for the LLM:",
                    });
                    messages.push({ content: fb, role: "user" });
                    break;
                }
            }
        }
        /* eslint-enable no-await-in-loop */
    }
}
