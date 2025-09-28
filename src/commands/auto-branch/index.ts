import {input, select} from "@inquirer/prompts";
import {Args, Command, Flags} from "@oclif/core";
import {Version2Client} from "jira.js";
import * as OpenAI from "openai";
import {simpleGit} from "simple-git";

import {AutoBranchConfig} from "../../types/auto-branch-config.js";
import {loadUserConfig} from "../../utils/user-config.js";

export type RecordKeys<T> = {
    [K in keyof T]: T[K] extends Record<string, unknown> ? K : never
}[keyof T];


export default class Index extends Command {
    static args = {
        issueId: Args.string({
            description: "Jira issue ID to fetch",
            name: "issueId",
            required: true,
        }),
    };
    static description =
        "Automatically generate commit messages from staged files with feedback loop";
    static flags = {
        instructions: Flags.string({
            char: "i",
            description:
                "Provide a specific instruction to the model for the commit message",
        }),
    };

    async getIssue({apiKey, email, hostname, issueId}: {
        apiKey: string,
        email: string,
        hostname: string;
        issueId: string
    }) {
        const client = new Version2Client({
            authentication: {
                basic: {
                    apiToken: apiKey,
                    email,
                },
            },
            host: `https://${hostname}`,
        });

        const issue = await client.issues.getIssue({issueIdOrKey: issueId});

        return {
            description: issue.fields.description,
            summary: issue.fields.summary,
            ticketId: issue.key,
        }
    }

    parseFieldFromIssueAndConfig(field: RecordKeys<AutoBranchConfig>, options: {
        issueIdOrLink: string,
        userConfig: Partial<AutoBranchConfig>
    }) {
        if (!options.userConfig[field]) {
            return null
        }

        try {
            const link = new URL(options.issueIdOrLink)

            return options.userConfig[field][link.hostname];
        } catch {
            if (!options.userConfig.DEFAULT_HOSTNAME) {
                return null
            }

            return options.userConfig[field][options.userConfig.DEFAULT_HOSTNAME];
        }
    }


    parseHostname(issueIdOrLink: string) {
        try {
            const link = new URL(issueIdOrLink)

            return link.hostname;
        } catch {
            return null
        }
    }

    parseIssueId(issueIdOrLink: string) {
        try {
            const link = new URL(issueIdOrLink)
            const pathParts = link.pathname.split("/");

            return pathParts.at(-1);

        } catch {
            return issueIdOrLink;
        }
    }

    async run(): Promise<void> {
        const {args, flags} = await this.parse(Index);
        const userConfig = await loadUserConfig<Partial<AutoBranchConfig>>("auto-branch");

        const apiKey = this.parseFieldFromIssueAndConfig("API_KEY", {
            issueIdOrLink: args.issueId,
            userConfig
        });

        const email = this.parseFieldFromIssueAndConfig("EMAIL", {
            issueIdOrLink: args.issueId,
            userConfig
        });
        const groqApiKey = userConfig.GROQ_API_KEY;

        const missing: string[] = [];
        if (!apiKey) {
            missing.push("API_KEY (use config)");
        }

        if (!groqApiKey) {
            missing.push("GROQ_API_KEY (use config)");
        }

        if (!email) {
            missing.push("EMAIL (use config)");
        }

        if (missing.length > 0) {
            this.error(`❌ Missing required fields:\n- ${missing.join("\n- ")}`);
        }

        const hostname = this.parseHostname(args.issueId) ?? userConfig.DEFAULT_HOSTNAME
        if(!hostname) {
            this.error(`❌ No DEFAULT_HOSTNAME set and issue does not contain full url`);
        }

        const parsedIssueId = this.parseIssueId(args.issueId);
        if (!parsedIssueId) {
            this.error(`❌ Could not parse an issue id from ${args.issueId} or link. Please provide a valid issue id or link.`);
        }

        const issue = await this.getIssue({
            apiKey: apiKey!,
            email: email!,
            hostname,
            issueId: parsedIssueId
        });
        console.log('issue :>>', issue);
        const git = simpleGit();
        const instructions =
            flags.instructions ??
            userConfig.INSTRUCTIONS

        const client = new OpenAI.OpenAI({
            apiKey: groqApiKey,
            baseURL: "https://api.groq.com/openai/v1",
        });

        const messages: OpenAI.OpenAI.Chat.ChatCompletionMessageParam[] = [
            {
                content:
                    "You are an assistant that generates git branch names based on the summary and description of a JIRA ticket. Only output the branch name itself.",
                role: "system",
            },
            {
                content: `
          Create a branch name using the following instructions and information.
          User Instructions: "${instructions}"
          Ticket ID: "${issue.ticketId}"
          Ticket Summary: "${issue.summary}"
          Ticket Description: "${issue.description}"
        `,
                role: "user",
            },
        ];

        let finished = false;
        let branchName = "";

        /* eslint-disable no-await-in-loop */
        while (!finished) {
            const response = await client.chat.completions.create({
                messages,
                model: "llama-3.3-70b-versatile",
                temperature: 0.4,
            });

            branchName = response.choices[0]?.message?.content?.trim() ?? "";
            if (!branchName) {
                this.error("❌ No branchn name received from Groq API");
            }

            this.log("\n🤖 Suggested branch message:");
            this.log(`   ${branchName}\n`);

            const decision = await select({
                choices: [
                    {name: "✅ Accept and create branch", value: "accept"},
                    {name: "✍️ Edit manually", value: "edit"},
                    {name: "🔁 Provide feedback", value: "feedback"},
                    {name: "❌ Cancel", value: "cancel"},
                ],
                message: "What would you like to do?",
            });

            switch (decision) {
                case "accept": {
                    await git.checkoutLocalBranch(branchName);
                    this.log("✅ Branch created!");
                    finished = true;
                    break;
                }

                case "cancel": {
                    this.log("🚫 Branch creation cancelled.");
                    finished = true;
                    break;
                }

                case "edit": {
                    const userEdit = await input({
                        default: branchName,
                        message: "Enter your custom branch name:",
                    });
                    await git.checkoutLocalBranch(userEdit);
                    this.log("✅ Branch created with custom name!");
                    finished = true;
                    break;
                }

                case "feedback": {
                    const fb = await input({
                        message: "Provide your feedback for the LLM:",
                    });
                    messages.push({content: fb, role: "user"});
                    break;
                }
            }
        }
        /* eslint-enable no-await-in-loop */
    }
}
