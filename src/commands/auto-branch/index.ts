import {input, select} from "@inquirer/prompts";
import {Args, Command, Flags} from "@oclif/core";
import chalk from "chalk";
import {simpleGit} from "simple-git";

import {getService, REQUIRED_FIELDS_BY_TYPE} from "../../services/index.js";
import {
    ISSUE_SERVICE_TYPES,
    IssueServiceConfig,
    IssueServiceType,
    SERVICE_DEFINITIONS
} from "../../types/issue-service-type.js";
import {IssueSummary} from "../../types/issue-summary.js";
import {checkIfInGitRepository} from "../../utils/check-if-in-git-repository.js";
import {ChatMessage, LLMChat} from "../../utils/llm-chat.js";
import * as LOGGER from "../../utils/logging.js";
import {loadGlobalUserConfig, loadLocalUserConfig, loadMergedUserConfig, saveUserConfig} from "../../utils/user-config.js";
import {AutoBranchConfig, AutoBranchConfigSchema} from "../../zod-schema/auto-branch-config.js";

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

    async run() {
        const {args, flags} = await this.parse(AutoBranchCommand);
        await checkIfInGitRepository(this);
        const userConfig = await loadMergedUserConfig<Partial<AutoBranchConfig>>(this, this.commandId);

        if (!URL.canParse(args.issueUrl)) {
            LOGGER.fatal(this, "IssueUrl was not a URL.");
        }

        const issueUrl = new URL(args.issueUrl);
        const {hostname} = issueUrl;

        let finalGroqApiKey = userConfig.GROQ_API_KEY;
        if (!finalGroqApiKey) {
            LOGGER.warn(this, "No GROQ_API_KEY set in your config.");

            finalGroqApiKey = await input({
                message: "Enter your GROQ API key",
            });
        }

        let askForSavingHostnameSettings = false;
        let finalServiceConfigOfHostname: IssueServiceConfig | undefined;
        const allHostnamesFromConfig = userConfig.HOSTNAMES ?? {};
        if (allHostnamesFromConfig[hostname] === undefined) {
            LOGGER.warn(this, `No config found for hostname: ${hostname}`);

            // ask for config for hostname
            const serviceType = await select({
                choices: ISSUE_SERVICE_TYPES.map(type => ({
                    description: type,
                    name: type,
                    value: type,
                })),
                message: 'Select your service type'
            });

            const requiredFieldsOfService = SERVICE_DEFINITIONS[serviceType]
            const configForHostname = {
                type: serviceType,
            } as IssueServiceConfig

            for (const key of requiredFieldsOfService.requiredFields) {
                if (key === "type") {
                    continue;
                }

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                // eslint-disable-next-line no-await-in-loop
                configForHostname[key] = await input({
                    message: `Enter your ${key}`,
                });
            }

            finalServiceConfigOfHostname = configForHostname;
            askForSavingHostnameSettings = true;
        } else {
            const serviceType = allHostnamesFromConfig[hostname].type as IssueServiceType;
            if (!ISSUE_SERVICE_TYPES.includes(serviceType)) {
                LOGGER.fatal(
                    this,
                    `Not supported type "${serviceType}" found for: ${hostname}\nAvailable service types: ${ISSUE_SERVICE_TYPES.join(", ")}`,
                );
            }

            const serviceConfig = allHostnamesFromConfig[hostname]!;
            const missingFields = this.getMissingFields(serviceConfig);

            if (missingFields.length > 0) {
                LOGGER.warn(this, `Some required config missing for hostname: ${hostname}\nMissing fields: ${missingFields.join(", ")}`);

                const configForHostname = {
                    type: serviceType,
                } as IssueServiceConfig

                for (const key of missingFields) {
                    if (key === "type") {
                        continue;
                    }

                    // eslint-disable-next-line no-await-in-loop
                    configForHostname[key] = await input({
                        message: `Enter your ${key}`,
                    });
                }

                finalServiceConfigOfHostname = configForHostname;
                askForSavingHostnameSettings = true;
            }
            else {
                finalServiceConfigOfHostname = serviceConfig;
            }
        }

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
        /* eslint-disable no-await-in-loop */
        while (!finished) {
            const branchName = await chat.generate();

            if (!branchName) {
                LOGGER.fatal(this, "No branch name received from Groq API");
            }

            finished = await this.handleUserDecision(branchName, chat);
        }
        /* eslint-enable no-await-in-loop */

        if (askForSavingHostnameSettings) {
            const saveSettingsIn = await select({
                choices: (["No", "Global", "Repository"] as const).map(type => ({
                    description: type,
                    name: type,
                    value: type,
                })),
                message: 'Want to save the settings for this hostname?'
            });

            if (saveSettingsIn === "No") {
                return;
            }

            const isGlobal = saveSettingsIn === "Global";
            const userConfigForRewrite = isGlobal
                ? await loadGlobalUserConfig<Partial<AutoBranchConfig>>(this, this.commandId)
                : await loadLocalUserConfig<Partial<AutoBranchConfig>>(this, this.commandId)

            if (userConfigForRewrite.HOSTNAMES === undefined) {
                userConfigForRewrite.HOSTNAMES = {};
            }

            userConfigForRewrite.HOSTNAMES[hostname] = finalServiceConfigOfHostname;

            // store groq if it was not already set
            if (finalGroqApiKey !== userConfig.GROQ_API_KEY) {
                userConfigForRewrite.GROQ_API_KEY = finalGroqApiKey;
            }

            await saveUserConfig(this.commandId, userConfigForRewrite, isGlobal)

            LOGGER.log(this, "Successfully stored config for hostname")


        }
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
