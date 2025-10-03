import { input, select } from "@inquirer/prompts";
import { Args, Command, Flags } from "@oclif/core";
import chalk from "chalk";
import { Version2Client } from "jira.js";
import * as OpenAI from "openai";
import { simpleGit } from "simple-git";

import { AutoBranchConfig } from "../../types/auto-branch-config.js";
import {IssueSummary} from "../../types/issue-summary.js";
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

        const issue = await this.getIssue(apiKey!, email!, finalHostname, parsedIssueId);
        if (!issue) {
            this.error(chalk.red(
                "❌ No issue found for the provided ID. Check the URL or API key. " +
                "If the issue is private, make sure to use an API key with the correct permissions."
            ));
        }

        const instructions = flags.instructions ?? userConfig.INSTRUCTIONS ?? "";
        const messages = this.buildInitialMessages(issue, instructions);
        const client = new OpenAI.OpenAI({ apiKey: groqApiKey, baseURL: "https://api.groq.com/openai/v1" });

        let finished = false;
        /* eslint-disable no-await-in-loop */
        while (!finished) {
            const branchName = await this.generateBranchName(client, messages);

            if (!branchName) {
                this.error(chalk.red("❌ No branch name received from Groq API"));
            }

            finished = await this.handleUserDecision(branchName, messages);
        }
        /* eslint-enable no-await-in-loop */
    }

    private buildInitialMessages(issue: IssueSummary, instructions: string) {
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
        ] as OpenAI.OpenAI.Chat.ChatCompletionMessageParam[];
    }

    private async generateBranchName(
        client: OpenAI.OpenAI,
        messages: OpenAI.OpenAI.Chat.ChatCompletionMessageParam[]
    ) {
        const response = await client.chat.completions.create({
            messages,
            model: "llama-3.3-70b-versatile",
            temperature: 0.4,
        });
        return response.choices[0]?.message?.content?.trim() ?? "";
    }

    private async getIssue(
        apiKey: string,
        email: string,
        hostname: string,
        issueId: string,
    ): Promise<IssueSummary | null> {
        const host = `https://${hostname}`;
        let issue;

        type Authentication =
            | { basic: { apiToken: string; email: string; } }
            | { oauth2: { accessToken: string } };

        const isTimeout = (error?: object) => error &&
            typeof error === 'object' &&
            'code' in error &&
            (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')

        const fetchIssue = async (auth: Authentication) => {
            const client = new Version2Client({
                authentication: auth,
                baseRequestConfig: {
                    timeout: 5000
                },
                host
            });
            return client.issues.getIssue({ issueIdOrKey: issueId });
        };

        try {
            issue = await fetchIssue({ basic: { apiToken: apiKey, email } });
        } catch (error) {
            if (isTimeout(error!)) {
                this.log(chalk.yellow('⚠️ Request timed out, retrying with OAuth2...'));
            }

            try {
                issue = await fetchIssue({ oauth2: { accessToken: apiKey } });
            } catch (error) {
                if (isTimeout(error!)) {
                    this.error(chalk.red('❌ Request timed out'));
                }

                return null;
            }
        }

        return {
            description: issue.fields.description || "",
            summary: issue.fields.summary,
            ticketId: issue.key,
        };
    }

    private async handleUserDecision(
        branchName: string,
        messages: OpenAI.OpenAI.Chat.ChatCompletionMessageParam[],
    ) {
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
                messages.push({ content: feedback, role: "user" });
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
        if (!userConfig[field]) {
            return null;
        }

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

    private validateRequiredConfig(
        argsIssueId: string,
        userConfig: Partial<AutoBranchConfig>
    ) {
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
