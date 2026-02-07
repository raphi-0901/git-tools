
import AutoCommitCommand from "../../commands/auto-commit/index.js";
import { renderCommitMessageInput } from "../../ui/CommitMessageInput.js";
import { renderTextInput } from "../../ui/TextInput.js";
import { AutoCommitConfigSchema, AutoCommitUpdateConfig } from "../../zod-schema/autoCommitConfig.js";
import * as LOGGER from "../logging.js";
import { withPromptExit } from "../withPromptExist.js";
import { getGroqApiKeyConfig } from "./handleGroqApiKeyConfig.js";
import { loadMergedUserConfig } from "./userConfigHelpers.js";

export async function getAutoCommitConfig(ctx: AutoCommitCommand) {
    const userConfig = await loadMergedUserConfig<AutoCommitUpdateConfig>(ctx);

    const groqApiCheck = await getGroqApiKeyConfig(ctx, userConfig.GROQ_API_KEY)
    let askForSavingSettings = groqApiCheck.finalGroqApiKey === userConfig.GROQ_API_KEY;

    let finalInstructions = userConfig.INSTRUCTIONS;
    if (!finalInstructions) {
        LOGGER.log(ctx, "");
        LOGGER.warn(ctx, "No INSTRUCTIONS set in your config.");
        finalInstructions = await withPromptExit(ctx, () => renderTextInput({
            defaultValue: userConfig.INSTRUCTIONS,
            message: "Enter your instructions on how to format the commit message:",
            validate(value: string) {
                if (!AutoCommitConfigSchema.shape.INSTRUCTIONS) {
                    return true;
                }

                const parsed = AutoCommitConfigSchema.shape.INSTRUCTIONS.safeParse(value);
                if (!parsed.success) {
                    return parsed.error.issues[0].message;
                }

                return true
            }
        }));

        askForSavingSettings = true;
    }

    let finalExamples = userConfig.EXAMPLES;
    if (!finalExamples) {
        LOGGER.log(ctx, "");
        LOGGER.warn(ctx, "No EXAMPLES set in your config.");

        const examples = []
        while (true) {
            const result = await withPromptExit(ctx, () => renderCommitMessageInput({
                message: "Provide some examples of commit messages you would like to generate: (leave empty if you don't want to provide any further examples)"
            }))

            if (result.message.trim() === "" && result?.description.join(',').trim() === "") {
                break;
            }

            const example = `${result?.message}\n${result?.description.join("\n")}`
            examples.push(example)
        }

        finalExamples = examples
        askForSavingSettings = true;
    }
    
    return {
        askForSavingSettings,
        finalExamples,
        finalGroqApiKey: groqApiCheck.finalGroqApiKey,
        finalInstructions,
        remainingTokensForLLM: groqApiCheck.remainingTokensForLLM,
    }
}
