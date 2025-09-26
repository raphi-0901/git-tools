import {input, select} from "@inquirer/prompts";
import {Command} from "@oclif/core";
import "dotenv/config";
import * as OpenAI from "openai";
import {simpleGit} from "simple-git";

import {loadUserConfig} from "../utils/load-user-config.js";

export default class AutoCommit extends Command {
    static description = "Erstelle automatisch Commit-Messages aus staged Files mit Feedback-Schleife";

    async run(): Promise<void> {
        const git = simpleGit();
        const diff = await git.diff(["--cached"]);

        if (diff.trim().length === 0) {
            this.warn("❌ No staged files to create a commit message");
            return;
        }

        const userConfig = await loadUserConfig("auto-commit");
        const branchSummary = await git.branch();
        const currentBranch = branchSummary.current;

        const client = new OpenAI.OpenAI({
            apiKey: process.env.GROQ_API_KEY,
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
                    Create a commit message using following instructions and information.
                    Instructions of User: "${userConfig.instruction ?? "Keep it short and conventional"}"
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
                // model: "llama-3.1-8b-instant",
                temperature: 0.1,
            });

            commitMessage = response.choices[0]?.message?.content?.trim() ?? "";
            if (!commitMessage) {
                this.error("❌ No commit message received from Groq API");
                return;
            }

            this.log("\n🤖 Vorschlag für Commit-Message:");
            this.log(`   ${commitMessage}\n`);

            const decision = await select({
                choices: [
                    {name: "✅ Akzeptieren und committen", value: "accept"},
                    {name: "✍️ Selbst abändern", value: "edit"},
                    {name: "🔁 Feedback geben", value: "feedback"},
                    {name: "❌ Abbrechen", value: "cancel"},
                ],
                message: "Was möchtest du tun?",
            });

            switch (decision) {
                case "accept": {
                    await git.commit(commitMessage);
                    this.log("✅ Commit ausgeführt!");
                    finished = true;

                    break;
                }

                case "cancel": {
                    this.log("🚫 Commit abgebrochen.");
                    finished = true;

                    break;
                }

                case "edit": {
                    const userEdit = await input({
                        default: commitMessage,
                        message: "Gib deine eigene Commit-Message ein:",
                    });
                    await git.commit(userEdit);
                    this.log("✅ Commit mit eigener Message ausgeführt!");
                    finished = true;

                    break;
                }

                case "feedback": {
                    const fb = await input({
                        message: "Formuliere dein Feedback für das LLM:",
                    });
                    messages.push({content: fb, role: "user"});

                    break;
                }
                // No default
            }
        }
        /* eslint-enable no-await-in-loop */
    }
}
