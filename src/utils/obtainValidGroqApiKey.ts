import { AuthenticationError } from "openai/core/error";

import { ExtendedCommand } from "../types/ExtendedCommand.js";
import { GroqApiKeySchema } from "../zod-schema/groqApiKey.js";
import { SIGINT_ERROR_NUMBER } from "./constants.js";
import { LLMChat } from "./llm-chat.js";
import * as LOGGER from "./logging.js";
import { promptForValue } from "./prompt-for-value.js";
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

                const newKey = await promptForValue({
                    key: "GROQ_API_KEY",
                    schema: GroqApiKeySchema
                });

                if (!newKey) {
                    ctx.exit(SIGINT_ERROR_NUMBER);
                }

                groqApiKey = newKey;
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
