import { encode } from "./gptTokenizer.js";

export function getLLMModel(messageToSend: string) {
    const tokens = encode(messageToSend).length

    if (tokens < 500) {
        return "llama-3.1-8b-instant"
    }

    if (tokens < 3000) {
        return "llama-4-maverick-17b"
    }

    return "llama-4-scout-17b"
}

