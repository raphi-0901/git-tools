import * as OpenAI from "openai";

import { GROQ_BASE_URL, MAX_TOKENS, STANDARD_LLM_MODEL } from "./constants.js";

export type ChatMessage = OpenAI.OpenAI.Chat.ChatCompletionMessageParam;

export class LLMChat {
    private client: OpenAI.OpenAI;
    private messages: ChatMessage[];

    constructor(apiKey: string, initialMessages: ChatMessage[] = [], baseURL = GROQ_BASE_URL) {
        this.client = new OpenAI.OpenAI({ apiKey, baseURL });
        this.messages = [...initialMessages];
    }

    /**
     * Add a message to the chat history.
     */
    addMessage(content: string, role: "assistant" | "system" | "user") {
        this.messages.push({ content, role });
    }

    /**
     * Generate a completion from the current chat history.
     */
    async generate(model = STANDARD_LLM_MODEL, temperature = 0.4) {
        const response = await this.client.chat.completions.create({
            messages: this.messages,
            model,
            temperature,
        });

        const content = response.choices[0]?.message?.content?.trim() ?? "";
        if (content) {
            this.messages.push({ content, role: "assistant" });
        }

        return content;
    }

    /**
     * Get the current chat messages.
     */
    getMessages() {
        return [...this.messages];
    }

    /**
     * Get Rate Limit Token Info for this client.
     */
    async getRemainingTokens(model = STANDARD_LLM_MODEL) {
        const response = await this.client.responses
            .create({ input: "ping", model })
            .withResponse();

        return (
            Number(
                response.response.headers.get("x-ratelimit-remaining-tokens")
            ) || MAX_TOKENS
        );
    }

    /**
     * Reset the chat history.
     */
    reset(messages: ChatMessage[] = []) {
        this.messages = [...messages];
    }
}
