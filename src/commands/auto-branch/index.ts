import { input, select } from "@inquirer/prompts";
import { Args, Command, Flags } from "@oclif/core";
import chalk from "chalk";
import { Version2Client } from "jira.js";
import { simpleGit } from "simple-git";

import {getService} from "../../services/index.js";
import {ISSUE_SERVICE_TYPES} from "../../services/issue-service.js";
import { AutoBranchConfig } from "../../types/auto-branch-config.js";
import { IssueSummary } from "../../types/issue-summary.js";
import { ChatMessage, LLMChat } from "../../utils/llm-chat.js";
import { loadUserConfig } from "../../utils/user-config.js";

type RecordKeys<T> = {
    [K in keyof T]: T[K] extends Record<string, unknown> ? K : never;
}[keyof T];

export default class Index extends Command {
    static args = {
        issueId: Args.string({
            description: "Jira issue ID to fetch",
            name: "issueId",
            required: true,
        }),
    };
static description = "Generate Git branch names from Jira tickets with AI suggestions and interactive feedback";
static flags = {
        instructions: Flags.string({
            char: "i",
            description: "Provide a specific instruction to the model for the commit message",
        }),
    };

    async run() {
        const { args, flags } = await this.parse(Index);
        const userConfig = await loadUserConfig<Partial<AutoBranchConfig>>(this, "auto-branch");
        const { apiKey, email, groqApiKey } = this.validateRequiredConfig(args.issueId, userConfig);

        const { hostname, issueId: parsedIssueId } = this.parseUrl(args.issueId);
        const finalHostname = hostname ?? userConfig.DEFAULT_HOSTNAME;
        if (!finalHostname) {
            this.error(chalk.red("❌ No DEFAULT_HOSTNAME set and issue does not contain full URL"));
        }

        let issue: IssueSummary | null = null;
        let usedService: null | string = null;

        for (const svc of ISSUE_SERVICE_TYPES) {
            try {
                issue = await getService(svc, {
                    token: "",
                    type: svc,
                }).getIssue(args.issueId);
                if (issue) {
                    usedService = svc;
                    break;
                }
            } catch {}
        }

        if (!issue) {
            this.error(chalk.red(
                "❌ No issue found for the provided ID. Check the URL or API key. " +
                "If the issue is private, make sure to use an API key with the correct permissions."
            ));
        }

        const instructions = flags.instructions ?? userConfig.INSTRUCTIONS ?? "";
        const initialMessages = this.buildInitialMessages(issue, instructions);

        const chat = new LLMChat(groqApiKey, initialMessages);

        let finished = false;
        /* eslint-disable no-await-in-loop */
        while (!finished) {
            const branchName = await chat.generate();

            if (!branchName) {
                this.error(chalk.red("❌ No branch name received from Groq API"));
            }

            finished = await this.handleUserDecision(branchName, chat);
        }
        /* eslint-enable no-await-in-loop */
    }

    private buildInitialMessages(issue: IssueSummary, instructions: string): ChatMessage[] {
        return [
            {
                content:
                    "You are an assistant that generates git branch names based on the summary and description of a JIRA ticket. Only output the branch name itself.",
                role: "system",
            },
            {
                content: `
User Instructions: "${instructions}"
Ticket ID: "${issue.ticketId}"
Ticket Summary: "${issue.summary}"
Ticket Description: "${issue.description}"
                `,
                role: "user",
            },
        ];
    }

    private async handleUserDecision(branchName: string, chat: LLMChat) {
        const git = simpleGit();
        this.log(chalk.blue("\n🤖 Suggested branch name:"));
        this.log(`   ${chalk.green(branchName)}\n`);

        const decision = await select({
            choices: [
                { name: "✅ Accept and create branch", value: "accept" },
                { name: "✍️ Edit manually", value: "edit" },
                { name: "🔁 Provide feedback", value: "feedback" },
                { name: "❌ Cancel", value: "cancel" },
            ],
            message: "What would you like to do?",
        });

        switch (decision) {
            case "accept": {
                await git.checkoutLocalBranch(branchName);
                this.log(chalk.green("✅ Branch created!"));
                return true;
            }

            case "cancel": {
                this.log(chalk.red("🚫 Branch creation cancelled."));
                return true;
            }

            case "edit": {
                const userEdit = await input({ default: branchName, message: "Enter your custom branch name:" });
                await git.checkoutLocalBranch(userEdit);
                this.log(chalk.green("✅ Branch created with custom name!"));
                return true;
            }

            case "feedback": {
                const feedback = await input({ message: "Provide your feedback for the LLM:" });
                chat.addMessage(feedback, "user");
                return false;
            }

            default: {
                return true;
            }
        }
    }

    private parseFieldFromConfig(
        field: RecordKeys<AutoBranchConfig>,
        issueIdOrLink: string,
        userConfig: Partial<AutoBranchConfig>
    ) {
        if (!userConfig[field]) return null;

        try {
            const url = new URL(issueIdOrLink);
            return userConfig[field][url.hostname] ?? userConfig[field][userConfig.DEFAULT_HOSTNAME!];
        } catch {
            return userConfig[field][userConfig.DEFAULT_HOSTNAME!];
        }
    }

    private parseUrl(issueIdOrLink: string) {
        try {
            const url = new URL(issueIdOrLink);
            const pathParts = url.pathname.replace(/\/$/, "").split("/");
            return { hostname: url.hostname, issueId: pathParts.at(-1) ?? "" };
        } catch {
            return { hostname: null, issueId: issueIdOrLink };
        }
    }

    private validateRequiredConfig(argsIssueId: string, userConfig: Partial<AutoBranchConfig>) {
        const requiredFields: Record<string, null | string | undefined> = {
            API_KEY: this.parseFieldFromConfig("API_KEY", argsIssueId, userConfig),
            EMAIL: this.parseFieldFromConfig("EMAIL", argsIssueId, userConfig),
            GROQ_API_KEY: userConfig.GROQ_API_KEY,
        };

        const missingFields = Object.entries(requiredFields)
            .filter(([_, value]) => !value)
            .map(([key]) => key);

        if (missingFields.length > 0) {
            this.error(chalk.red(`❌ Missing required fields in config: ${missingFields.join(", ")}`));
        }

        return {
            apiKey: requiredFields.API_KEY!,
            email: requiredFields.EMAIL!,
            groqApiKey: requiredFields.GROQ_API_KEY!,
        };
    }
}
