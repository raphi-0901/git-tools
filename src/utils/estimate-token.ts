import { encoding_for_model as encodingForModel } from "tiktoken";

export async function estimateTokens(input: string) {
    const enc = encodingForModel("gpt-4o-mini");
    const tokens = enc.encode(input).length;
    enc.free();
    return tokens;
}
