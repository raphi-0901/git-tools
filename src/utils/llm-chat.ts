import * as OpenAI from "openai";

export type ChatMessage = OpenAI.OpenAI.Chat.ChatCompletionMessageParam;

export class LLMChat {
    private client: OpenAI.OpenAI;
    private messages: ChatMessage[];

    constructor(apiKey: string, initialMessages: ChatMessage[] = [], baseURL = "https://api.groq.com/openai/v1") {
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
    async generate(model = "openai/gpt-oss-120b", temperature = 0.4): Promise<string> {
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
     * Reset the chat history.
     */
    reset(messages: ChatMessage[] = []) {
        this.messages = [...messages];
    }
}
