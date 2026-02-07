import { AuthenticationError } from "openai/core/error";

import { LLMChat } from "./LLMChat.js";

export type ValidatedGroqApiKeyResult = {
    error: unknown,
    result: "ERROR",
} | {
    groqApiKey: string,
    remainingTokensForLLM: number,
    result: "OK",
} | {
    result: "INVALID_KEY",
};

export async function obtainValidGroqApiKey(groqApiKey: string): Promise<ValidatedGroqApiKeyResult> {
    let remainingTokensForLLM: null | number = null;
    const chat = new LLMChat(groqApiKey);
    try {
        remainingTokensForLLM = await chat.getRemainingTokens();
        // leave buffer for output tokens
        remainingTokensForLLM = Math.min(300, Math.max(0, remainingTokensForLLM - 300));

        return  {
            groqApiKey,
            remainingTokensForLLM,
            result: "OK",
        }
    } catch (error) {
        // wait a bit before retrying
        await new Promise((resolve) => {
            setTimeout(resolve, 1000);
        });

        if (error instanceof AuthenticationError && error.status === 401) {
            return {
                result: "INVALID_KEY",
            }
        }

        return {
            error,
            result: "ERROR",
        }
    }
}
