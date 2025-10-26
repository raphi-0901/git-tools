import {input, select} from "@inquirer/prompts";
import {Args, Command, Flags} from "@oclif/core";
import chalk from "chalk";
import {simpleGit} from "simple-git";

import {getService, REQUIRED_FIELDS_BY_TYPE} from "../../services/index.js";
import {ISSUE_SERVICE_TYPES, IssueServiceConfig, IssueServiceType} from "../../types/issue-service-type.js";
import {IssueSummary} from "../../types/issue-summary.js";
import {checkIfInGitRepository} from "../../utils/check-if-in-git-repository.js";
import {createSpinner} from "../../utils/create-spinner.js";
import {gatherAutoBranchConfigForHostname} from "../../utils/gather-auto-branch-config.js";
import {getSchemaForUnionOfAutoBranch} from "../../utils/get-schema-for-union-of-auto-branch.js";
import {ChatMessage, LLMChat} from "../../utils/llm-chat.js";
import * as LOGGER from "../../utils/logging.js";
import {promptForValue} from "../../utils/prompt-for-value.js";
import {saveGatheredSettings} from "../../utils/save-gathered-settings.js";
import {
    loadGlobalUserConfig,
    loadLocalUserConfig,
    loadMergedUserConfig,
    saveUserConfig
} from "../../utils/user-config.js";
import {
    AutoBranchConfig,
    AutoBranchConfigSchema,
    AutoBranchServiceConfig,
    AutoBranchUpdateConfig
} from "../../zod-schema/auto-branch-config.js";

export default class AutoBranchCommand extends Command {
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
    public readonly commandId = "auto-branch";

    async catch() {
        this.log(chalk.red("🚫 Branch creation cancelled."));
    }

    async run() {
        const {args, flags} = await this.parse(AutoBranchCommand);
        await checkIfInGitRepository(this);
        const userConfig = await loadMergedUserConfig<AutoBranchUpdateConfig>(this, this.commandId);

        if (!URL.canParse(args.issueUrl)) {
            LOGGER.fatal(this, "IssueUrl was not a URL.");
        }

        const issueUrl = new URL(args.issueUrl);
        const {hostname} = issueUrl;

        const {shape} = AutoBranchConfigSchema;
        let finalGroqApiKey = userConfig.GROQ_API_KEY;
        if (!finalGroqApiKey) {
            LOGGER.warn(this, "No GROQ_API_KEY set in your config.");

            finalGroqApiKey = await promptForValue({key: 'GROQ_API_KEY', schema: shape.GROQ_API_KEY})
        }

        let askForSavingHostnameSettings = false;
        let finalServiceConfigOfHostname: AutoBranchServiceConfig | undefined;
        const allHostnamesFromConfig = userConfig.HOSTNAMES ?? {};
        if (allHostnamesFromConfig[hostname] === undefined) {
            LOGGER.warn(this, `No config found for hostname: ${hostname}`);
            askForSavingHostnameSettings = true;
            finalServiceConfigOfHostname = await gatherAutoBranchConfigForHostname(Object.keys(allHostnamesFromConfig), hostname, allHostnamesFromConfig[hostname]);
            if (!finalServiceConfigOfHostname) {
                // should never happen
                LOGGER.fatal(this, `No service config found for hostname: ${hostname}`)
            }
        } else {
            const serviceType = allHostnamesFromConfig[hostname].type as IssueServiceType;
            if (!ISSUE_SERVICE_TYPES.includes(serviceType)) {
                LOGGER.fatal(
                    this,
                    `Not supported type "${serviceType}" found for: ${hostname}\nAvailable service types: ${ISSUE_SERVICE_TYPES.join(", ")}`,
                );
            }

            const serviceConfig = allHostnamesFromConfig[hostname]!;
            const schemaForType = getSchemaForUnionOfAutoBranch(serviceType)!;

            // validate against schema
            const isSafe = schemaForType.safeParse(serviceConfig)
            console.log('isSafe :>>', isSafe);

            if (isSafe.success) {
                finalServiceConfigOfHostname = isSafe.data;
            } else {
                askForSavingHostnameSettings = true;
                finalServiceConfigOfHostname = await gatherAutoBranchConfigForHostname(Object.keys(allHostnamesFromConfig), hostname, allHostnamesFromConfig[hostname]);
                if (!finalServiceConfigOfHostname) {
                    // should never happen
                    LOGGER.fatal(this, `No service config found for hostname: ${hostname}`)
                }
            }
        }

        if (!finalServiceConfigOfHostname) {
            // should never happen
            LOGGER.fatal(this, `No service config found for hostname: ${hostname}`);
        }

        const spinner = createSpinner({
            text: "Analyzing issue for branch name generation...",
        }).start();

        const service = getService(finalServiceConfigOfHostname.type, finalServiceConfigOfHostname);
        if (!service) {
            LOGGER.fatal(this, `Error while creating service for hostname: ${hostname}`);
        }

        const issue = await service.getIssue(new URL(args.issueUrl))
        if (!issue) {
            LOGGER.fatal(
                this,
                "No issue found for the provided ID. Check the URL or API key. " +
                "If the issue is private, make sure to use an API key with the correct permissions.",
            );
        }

        const instructions = flags.instructions ?? finalServiceConfigOfHostname.instructions;
        const initialMessages = this.buildInitialMessages(issue, instructions);

        const chat = new LLMChat(finalGroqApiKey, initialMessages);

        let finished = false;

        while (!finished) {
            spinner.text = "Generating branch name from issue...";
            spinner.start()
            const branchName = await chat.generate();
            spinner.stop()

            if (!branchName) {
                LOGGER.fatal(this, "No branch name received from Groq API");
            }

            finished = await this.handleUserDecision(branchName, chat);
        }

        if (!askForSavingSettings) {
            return;
        }

        await saveGatheredSettings(this, this.commandId, {
            GROQ_API_KEY: finalGroqApiKey,
            HOSTNAMES: {
                [hostname]: finalServiceConfigOfHostname,
            }
        })
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
                this.log(chalk.green("✅ Branch created!"));
                return true;
            }

            case "cancel": {
                this.log(chalk.red("🚫 Branch creation cancelled."));
                return true;
            }

            case "edit": {
                const userEdit = await input({default: branchName, message: "Enter your custom branch name:"});
                await git.checkoutLocalBranch(userEdit);
                this.log(chalk.green("✅ Branch created with custom name!"));
                return true;
            }

            case "feedback": {
                const feedback = await input({message: "Provide your feedback for the LLM:"});
                chat.addMessage(feedback, "user");
                return false;
            }

            default: {
                return true;
            }
        }
    }
}
