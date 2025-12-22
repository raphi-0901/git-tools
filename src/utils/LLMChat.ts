import * as OpenAI from "openai";

import { GROQ_BASE_URL, MAX_TOKENS } from "./constants.js";

export type ChatMessage = OpenAI.OpenAI.Chat.ChatCompletionMessageParam;

export class LLMChat {
    private _remainingTokens: number = -1;
    private client: OpenAI.OpenAI;
    private messages: ChatMessage[];

    constructor(apiKey: string, initialMessages: ChatMessage[] = [], baseURL = GROQ_BASE_URL) {
        this.client = new OpenAI.OpenAI({ apiKey, baseURL });
        this.messages = [...initialMessages];
    }

    get remainingTokens() {
        return this._remainingTokens;
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
    async generate(model: string, temperature = 0.4) {
        const response = await this.client.chat.completions.create({
            messages: this.messages,
            model,
            temperature,
        }).withResponse();

        this._remainingTokens = this.getRemainingTokensFromHeader(response.response);

        const content = response.data.choices[0]?.message?.content?.trim() ?? "";
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
    async getRemainingTokens(model: string) {
        const response = await this.client.responses
            .create({ input: "ping", model })
            .withResponse();

        this._remainingTokens = this.getRemainingTokensFromHeader(response.response);
        return this._remainingTokens;
    }

    /**
     * Reset the chat history.
     */
    reset(messages: ChatMessage[] = []) {
        this.messages = [...messages];
    }

     
    private getRemainingTokensFromHeader(response: Response) {
        return Number(response.headers.get("x-ratelimit-remaining-tokens")) || MAX_TOKENS;
    }
}
