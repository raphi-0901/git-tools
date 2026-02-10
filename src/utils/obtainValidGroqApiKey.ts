import { AuthenticationError } from "openai/core/error";

import { BaseCommand } from "../base-commands/BaseCommand.js";
import { GroqApiKeySchema } from "../zod-schema/groqApiKey.js";
import { promptForTextConfigValue } from "./config/promptForConfigValue.js";
import { LLMChat } from "./LLMChat.js";
import * as LOGGER from "./logging.js";

/**
 * Ensures a valid GROQ API key is available for use with the LLM.
 *
 * - Checks the validity of the provided API key by attempting to retrieve remaining tokens.
 * - If the key is invalid (401), prompts the user to enter a new key.
 * - Retries until a valid key is obtained or an unexpected error occurs.
 *
 * @param ctx The command context, used for logging, spinner, and prompting.
 * @param initialGroqApiKey The initial GROQ API key to validate.
 * @returns A promise that resolves to an object containing:
 *          - `groqApiKey`: a valid GROQ API key
 *          - `remainingTokensForLLM`: the number of remaining tokens available for the LLM
 */
export async function obtainValidGroqApiKey(
    ctx: BaseCommand,
    initialGroqApiKey: string
) {
    ctx.spinner.text = "Checking validity of GROQ API key...";

    let remainingTokensForLLM: null | number = null;
    let groqApiKey = initialGroqApiKey;
    let chat = new LLMChat(groqApiKey);

    while (true) {
        try {
            ctx.spinner.start();
            remainingTokensForLLM = await chat.getRemainingTokens();

            // leave buffer for output tokens
            remainingTokensForLLM -= Math.min(300, Math.max(0, remainingTokensForLLM - 300));

            ctx.spinner.stop();

            LOGGER.debug(ctx, `Remaining tokens for LLM: ${remainingTokensForLLM}`);
            break;
        } catch (error) {
            // wait a bit before retrying
            await new Promise((resolve) => {
                setTimeout(resolve, 1000);
            });
            ctx.spinner.stop();

            if (error instanceof AuthenticationError && error.status === 401) {
                LOGGER.warn(ctx, "Your GROQ_API_KEY is invalid. Please provide a new one.");

                groqApiKey = await promptForTextConfigValue(ctx, {
                    schema: GroqApiKeySchema,
                });
                chat = new LLMChat(groqApiKey);
            } else {
                LOGGER.fatal(ctx, `Unexpected error while checking tokens: ${error}`);
            }
        }
    }

    return {
        groqApiKey,
        remainingTokensForLLM,
    };
}
