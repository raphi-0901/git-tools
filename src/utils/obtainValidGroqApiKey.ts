import { AuthenticationError } from "openai/core/error";

import { BaseCommand } from "../base-commands/BaseCommand.js";
import { GroqApiKeySchema } from "../zod-schema/groqApiKey.js";
import { promptForTextConfigValue } from "./config/promptForConfigValue.js";
import { getLLMModel } from "./getLLMModel.js";
import { LLMChat } from "./LLMChat.js";
import * as LOGGER from "./logging.js";

export async function obtainValidGroqApiKey(ctx: BaseCommand, initialGroqApiKey: string) {
    ctx.spinner.text = "Checking validity of GROQ API key..."

    let remainingTokensForLLM: null | number = null;
    let groqApiKey = initialGroqApiKey;
    let chat = new LLMChat(groqApiKey);

    while (true) {
        try {
            ctx.spinner.start();
            remainingTokensForLLM = await chat.getRemainingTokens(getLLMModel("ping"));
            ctx.spinner.stop();

            LOGGER.debug(ctx, `Remaining tokens for LLM: ${remainingTokensForLLM}`)
            break;
        } catch (error) {
            // wait a bit before retrying
            await new Promise(resolve => {
                setTimeout(resolve, 1000)
            });
            ctx.spinner.stop();

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
