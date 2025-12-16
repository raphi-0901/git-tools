import { Args } from "@oclif/core";
import chalk from "chalk";
import { simpleGit } from "simple-git";

import { BaseCommand } from "../../base-commands/BaseCommand.js";
import { getService } from "../../services/index.js";
import { IssueSummary } from "../../types/IssueSummary.js";
import { renderSelectInput } from "../../ui/SelectInput.js";
import { renderTextInput } from "../../ui/TextInput.js";
import { checkIfInGitRepository } from "../../utils/checkIfInGitRepository.js";
import { promptForTextConfigValue } from "../../utils/config/promptForConfigValue.js";
import { saveGatheredSettings } from "../../utils/config/saveGatheredSettings.js";
import { loadMergedUserConfig } from "../../utils/config/userConfigHelpers.js";
import { gatherAutoBranchConfigForHostname } from "../../utils/gatherAutoBranchConfigForHostname.js";
import { getSchemaForUnionOfAutoBranch } from "../../utils/getSchemaForUnionOfAutoBranch.js";
import { countTokens } from "../../utils/gptTokenizer.js";
import { isOnline } from "../../utils/isOnline.js";
import { ChatMessage, LLMChat } from "../../utils/LLMChat.js";
import * as LOGGER from "../../utils/logging.js";
import { obtainValidGroqApiKey } from "../../utils/obtainValidGroqApiKey.js";
import { withPromptExit } from "../../utils/withPromptExist.js";
import {
    AutoBranchConfigSchema,
    AutoBranchServiceConfig, AutoBranchServiceTypeValues,
    AutoBranchUpdateConfig
} from "../../zod-schema/autoBranchConfig.js";

export default class AutoBranchCommand extends BaseCommand<typeof AutoBranchCommand> {
    static args = {
        issueUrl: Args.string({
            description: "Jira issue ID to fetch",
            name: "issueUrl",
            required: true,
        }),
    };
    static description = "Generate Git branch names from Jira tickets with AI suggestions and interactive feedback";
    public readonly configId = "branch"

    async catch(error: unknown) {
        super.catch(error);
        this.log(chalk.red("🚫 Branch creation cancelled."));
    }

    async run() {
        this.timer.start("total");
        this.timer.start("response");
        await checkIfInGitRepository(this);

        if (!URL.canParse(this.args.issueUrl)) {
            LOGGER.fatal(this, "IssueUrl was not a URL.");
        }

        const issueUrl = new URL(this.args.issueUrl);
        const { hostname } = issueUrl;

        const finalConfig = await this.getFinalConfig(hostname);
        const { askForSavingSettings, finalServiceConfigOfHostname } = finalConfig
        LOGGER.debug(this, `Final config: ${JSON.stringify(finalConfig, null, 2)}`)

        await isOnline(this)
        const { groqApiKey: finalGroqApiKey, remainingTokensForLLM } = await obtainValidGroqApiKey(this, finalConfig.finalGroqApiKey)

        this.spinner.text = "Analyzing issue for branch name generation..."
        this.spinner.start();

        const service = getService(finalServiceConfigOfHostname.type, finalServiceConfigOfHostname);
        if (!service) {
            LOGGER.fatal(this, `Error while creating service for hostname: ${hostname}`);
        }

        const issue = await service.getIssue(new URL(this.args.issueUrl))
        if (!issue) {
            LOGGER.fatal(
                this,
                "No issue found for the provided ID. Check the URL or API key. " +
                "If the issue is private, make sure to use an API key with the correct permissions.",
            );
        }

        const initialMessages = this.buildInitialMessages(issue, finalServiceConfigOfHostname.instructions);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const tokensOfInitialMessages = countTokens(initialMessages)
        LOGGER.debug(this, `Initial messages takes ${tokensOfInitialMessages} of ${remainingTokensForLLM} tokens: ${JSON.stringify(initialMessages, null, 2)}`)

        const chat = new LLMChat(finalGroqApiKey, initialMessages);

        let finished = false;
        let branchName = "";
        while (!finished) {
            this.spinner.text = "Generating branch name from issue...";
            this.spinner.start()
            try {
                branchName = await chat.generate();
            } catch (error) {
                LOGGER.fatal(this, "Error while generating branch name: " + error)
            }

            LOGGER.debug(this, `Tokens left: ${chat.remainingTokens}`)
            LOGGER.debug(this, `Time taken: ${this.timer.stop("response")}`)

            this.spinner.stop()

            if (!branchName) {
                LOGGER.fatal(this, "No branch name received from Groq API");
            }

            finished = await this.handleUserDecision(branchName, chat);
            this.timer.start("response")
        }

        LOGGER.debug(this, `Action took ${this.timer.stop("total")}.`)
        if (!askForSavingSettings) {
            return;
        }

        await saveGatheredSettings(this, {
            GROQ_API_KEY: finalGroqApiKey,
            HOSTNAMES: {
                [hostname]: finalServiceConfigOfHostname,
            }
        })
    }

    private buildInitialMessages(issue: IssueSummary, instructions: string): ChatMessage[] {
        return [
            {
                content: `
You are an assistant that generates git branch names.

Strict rules:
- ALWAYS output exactly one git branch name.
- NEVER output explanations or additional text.
- The output must ALWAYS be a single git-safe string (lowercase, hyphens, no spaces).
- NEVER concatenate the previous branch name to itself or append a full duplicate.
- When refining a branch name, ALWAYS reconstruct it cleanly based on:
  (1) the ticket information and 
  (2) the user's refinement request.
  NEVER reuse the previous string literally as a base for concatenation.
- If the user input is chit-chat, irrelevant, emotional, or non-actionable,
  REPEAT the previous branch name exactly.
- A refinement request includes words like:
  "longer", "shorter", "more detail", "less detail", "different prefix", 
  "add X", "remove Y", "change Z", etc.
- A refinement MUST always produce a properly formatted branch name,
  not a doubled or corrupted string.
`,
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

    private async getFinalConfig(hostname: string) {
        const userConfig = await loadMergedUserConfig<AutoBranchUpdateConfig>(this);

        let askForSavingSettings = false;
        let finalGroqApiKey = userConfig.GROQ_API_KEY;
        if (!finalGroqApiKey) {
            LOGGER.warn(this, "No GROQ_API_KEY set in your config.");
            finalGroqApiKey = await promptForTextConfigValue(this, {
                schema: AutoBranchConfigSchema.shape.GROQ_API_KEY,
            });
            askForSavingSettings = true;
        }

        let finalServiceConfigOfHostname: AutoBranchServiceConfig | undefined;
        const allHostnamesFromConfig = userConfig.HOSTNAMES ?? {};
        if (allHostnamesFromConfig[hostname] === undefined) {
            LOGGER.warn(this, `No config found for hostname: ${hostname}`);
            askForSavingSettings = true;
            finalServiceConfigOfHostname = await gatherAutoBranchConfigForHostname(this, Object.keys(allHostnamesFromConfig), hostname, allHostnamesFromConfig[hostname]);
            if (!finalServiceConfigOfHostname) {
                // should never happen
                LOGGER.fatal(this, `No service config found for hostname: ${hostname}`)
            }
        } else {
            const serviceType = allHostnamesFromConfig[hostname].type;
            if (!serviceType || !AutoBranchServiceTypeValues.includes(serviceType)) {
                LOGGER.fatal(
                    this,
                    `Not supported type "${serviceType}" found for: ${hostname}\nAvailable service types: ${AutoBranchServiceTypeValues.join(", ")}`,
                );
            }

            const serviceConfig = allHostnamesFromConfig[hostname]!;
            const schemaForType = getSchemaForUnionOfAutoBranch(serviceType)!;

            // validate against schema
            const isSafe = schemaForType.safeParse(serviceConfig)
            if (isSafe.success) {
                finalServiceConfigOfHostname = isSafe.data;
            } else {
                LOGGER.debug(this, `Invalid config found for hostname: ${hostname}. Error: ${isSafe.error.message}`)
                askForSavingSettings = true;
                finalServiceConfigOfHostname = await gatherAutoBranchConfigForHostname(this, Object.keys(allHostnamesFromConfig), hostname, allHostnamesFromConfig[hostname]);
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

        return {
            askForSavingSettings,
            finalGroqApiKey,
            finalServiceConfigOfHostname,
        }
    }

    private async handleUserDecision(branchName: string, chat: LLMChat) {
        const git = simpleGit();
        this.log(chalk.blue("\n🤖 Suggested branch name:"));
        this.log(`   ${chalk.green(branchName)}\n`);

        const decision = this.flags.yes
            ? "accept"
            : await withPromptExit(this, () => renderSelectInput({
                items: [
                    { label: "✅ Accept and create branch", value: "accept" },
                    { label: "✍️ Edit manually", value: "edit" },
                    { label: "🔁 Provide feedback", value: "feedback" },
                    { label: "❌ Cancel", value: "cancel" },
                ] as const,
                message: "What would you like to do?",
            }));

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
                const userEdit = await withPromptExit(this, () => renderTextInput({
                    defaultValue: branchName,
                    message: "Enter your custom branch name:"
                }));
                await git.checkoutLocalBranch(userEdit);
                this.log(chalk.green("✅ Branch created with custom name!"));

                return true;
            }

            case "feedback": {
                const feedback = await withPromptExit(this, () => renderTextInput({
                    message: "Provide your feedback for the LLM:"
                }));

                chat.addMessage(feedback, "user");
                return false;
            }
        }
    }
}
