import * as OpenAI from "openai";

import { GROQ_BASE_URL, MAX_TOKENS, STANDARD_LLM_MODEL } from "./constants.js";

export async function getRemainingTokensOfLLMChat({
                                                apiKey,
                                                baseURL = GROQ_BASE_URL,
                                                model = STANDARD_LLM_MODEL,
                                            }: {
    apiKey: string;
    baseURL?: string;
    model?: string;
}) {
    const client = new OpenAI.OpenAI({ apiKey, baseURL });
    const response = await client.responses.create({
        input: "ping", // minimal input
        model,
    }).withResponse()

    return Number(response.response.headers.get("x-ratelimit-remaining-tokens")) || MAX_TOKENS
}
