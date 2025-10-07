import { input, select } from "@inquirer/prompts";
import { Args, Command, Flags } from "@oclif/core";
import chalk from "chalk";
import { simpleGit } from "simple-git";

import {getService, REQUIRED_FIELDS_BY_TYPE} from "../../services/index.js";
import { AutoBranchConfig } from "../../types/auto-branch-config.js";
import {ISSUE_SERVICE_TYPES, IssueServiceConfig, IssueServiceType} from "../../types/issue-service-type.js";
import { IssueSummary } from "../../types/issue-summary.js";
import { ChatMessage, LLMChat } from "../../utils/llm-chat.js";
import { loadUserConfig } from "../../utils/user-config.js";

export default class Index extends Command {
    static args = {
        issueUrl: Args.string({
            description: "Jira issue ID to fetch",
            name: "issueUrl",
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
        if (!userConfig.GROQ_API_KEY) {
            this.error(chalk.red("❌ No GROQ_API_KEY set in your config."))
        }

        if(!URL.canParse(args.issueUrl)) {
            this.error(chalk.red(`❌ IssueUrl was not a URL.`));
        }

        const issueUrl = new URL(args.issueUrl);
        const {hostname} = issueUrl;
        if (!hostname) {
            this.error(chalk.red("❌ No DEFAULT_HOSTNAME set and issue does not contain full URL"));
        }

        const allHostnamesFromConfig = userConfig.HOSTNAMES ?? {};
        if(allHostnamesFromConfig[hostname] === undefined) {
            this.error(chalk.red(`❌ No config found for hostname: ${hostname}`));
        }

        const serviceType = allHostnamesFromConfig[hostname].type as IssueServiceType;
        if(!ISSUE_SERVICE_TYPES.includes(serviceType)) {
            this.error(chalk.red(`❌ Not supported type "${serviceType}" found for: ${hostname}\nAvailable service types: ${ISSUE_SERVICE_TYPES.join(", ")}`));
        }

        const serviceConfig = allHostnamesFromConfig[hostname]!;
        const missingFields = this.getMissingFields(serviceConfig);

        if (missingFields.length > 0) {
            this.error(chalk.red(
                `❌ Some required config missing for hostname: ${hostname}\nMissing fields: ${missingFields.join(", ")}`
            ));
        }

        const service = getService(serviceType, serviceConfig);
        const issue = await service.getIssue(new URL(args.issueUrl))
        if (!issue) {
            this.error(chalk.red(
                "❌ No issue found for the provided ID. Check the URL or API key. " +
                "If the issue is private, make sure to use an API key with the correct permissions."
            ));
        }

        const instructions = flags.instructions ?? serviceConfig.instructions;
        const initialMessages = this.buildInitialMessages(issue, instructions);

        const chat = new LLMChat(userConfig.GROQ_API_KEY, initialMessages);

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
                    "You are an assistant that generates git branch names based on the summary and description of a ticket. Only output the branch name itself. Take the user instruction into account.",
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

    private getMissingFields<T extends IssueServiceConfig>(service: T): (keyof T)[] {
        const requiredFields = REQUIRED_FIELDS_BY_TYPE[service.type] as (keyof T)[];
        return requiredFields.filter(
            (field) => service[field] === undefined || service[field] === ""
        );
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
}
