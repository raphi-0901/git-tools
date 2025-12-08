import { AuthenticationError } from "openai/core/error";

import { ExtendedCommand } from "../types/ExtendedCommand.js";
import { GroqApiKeySchema } from "../zod-schema/groqApiKey.js";
import { promptForTextConfigValue } from "./config/promptForConfigValue.js";
import { LLMChat } from "./llm-chat.js";
import * as LOGGER from "./logging.js";
import { setSpinnerText, startSpinner, stopSpinner } from "./spinner.js";

export async function obtainValidGroqApiKey(ctx: ExtendedCommand, initialGroqApiKey: string) {
    setSpinnerText(ctx, "Checking validity of GROQ API key...");
    let remainingTokensForLLM: null | number = null;
    let groqApiKey = initialGroqApiKey;
    let chat = new LLMChat(groqApiKey);

    while (true) {
        try {
            startSpinner(ctx)
            remainingTokensForLLM = await chat.getRemainingTokens();
            stopSpinner(ctx);

            LOGGER.debug(ctx, `Remaining tokens for LLM: ${remainingTokensForLLM}`)
            break;
        } catch (error) {
            // wait a bit before retrying
            await new Promise(resolve => {
                setTimeout(resolve, 1000)
            });
            stopSpinner(ctx);

            if (error instanceof AuthenticationError && error.status === 401) {
                LOGGER.warn(ctx, "Your GROQ_API_KEY is invalid. Please provide a new one.");

                groqApiKey = await promptForTextConfigValue(ctx, {
                    schema: GroqApiKeySchema
                });
                chat = new LLMChat(groqApiKey);
            } else {
                LOGGER.fatal(ctx, `Unexpected error while checking tokens: ${error}`);
            }
        }
    }

    return {
        groqApiKey,
        remainingTokensForLLM
    }
}
