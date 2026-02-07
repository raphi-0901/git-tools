import terminalLink from "terminal-link";

import { BaseCommand } from "../../base-commands/BaseCommand.js";
import { renderTextInput } from "../../ui/TextInput.js";
import { GroqApiKeySchema } from "../../zod-schema/groqApiKey.js";
import * as LOGGER from "../logging.js";
import { obtainValidGroqApiKey } from "../obtainValidGroqApiKey.js";
import { withPromptExit } from "../withPromptExist.js";

export async function getGroqApiKeyConfig(ctx: BaseCommand, initialGroqApiKey?: string) {
    let remainingTokensForLLM: number = 0;
    let finalGroqApiKey: string | undefined;

    if (typeof initialGroqApiKey === "string" && initialGroqApiKey.trim()) {
        const isValidGroqApiKey = await obtainValidGroqApiKey(initialGroqApiKey)

        switch (isValidGroqApiKey.result) {
            case "ERROR": {
                LOGGER.fatal(ctx, "Unexpected error happened while checking Groq API key")
                break
            }

            case "INVALID_KEY": {
                LOGGER.warn(ctx, "Your Groq API key is invalid. Please provide a new one.")
                initialGroqApiKey = undefined
                break;
            }

            case "OK": {
                remainingTokensForLLM = isValidGroqApiKey.remainingTokensForLLM
                finalGroqApiKey = isValidGroqApiKey.groqApiKey

                break;
            }

            default: {
                LOGGER.debug(ctx, `Error: ${isValidGroqApiKey satisfies never}`)
                LOGGER.fatal(ctx, "Unexpected error happened while checking Groq API key.")
            }
        }
    }

    if (!finalGroqApiKey) {
        if(initialGroqApiKey === undefined) {
            LOGGER.warn(ctx, `No GROQ_API_KEY set in your config. Generate one ${terminalLink('here', `https://console.groq.com/keys`)}.`);
        }

        finalGroqApiKey = await withPromptExit(ctx, () => renderTextInput({
            defaultValue: initialGroqApiKey,
            message: "Enter your Groq API key:",
            messageWhileValidating: "Checking validity of GROQ API key...",
            async validate(value: string) {
                const parsed = GroqApiKeySchema.safeParse(value);
                if (!parsed.success) {
                    return parsed.error.issues[0].message;
                }

                const isValidGroqApiKey = await obtainValidGroqApiKey(value)
                switch (isValidGroqApiKey.result) {
                    case "ERROR": {
                        LOGGER.fatal(ctx, "Unexpected error happened while checking Groq API key")
                        break
                    }

                    case "INVALID_KEY": {
                        return "Your Groq API key is invalid. Please provide a new one."
                    }

                    case "OK": {
                        remainingTokensForLLM = isValidGroqApiKey.remainingTokensForLLM

                        return true;
                    }

                    default: {
                        LOGGER.debug(ctx, `Error: ${isValidGroqApiKey satisfies never}`)
                        LOGGER.fatal(ctx, "Unexpected error happened while checking Groq API key.")
                    }
                }
            }
        }));
    }

    return {
        finalGroqApiKey,
        remainingTokensForLLM,
    }
}
