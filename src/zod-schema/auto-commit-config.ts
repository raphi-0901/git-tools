import * as z from "zod";

import { GroqApiKeySchema } from "./groqApiKey.js";

export const AutoCommitConfigSchema = z.strictObject({
    EXAMPLES: z.array(z.string()),
    GROQ_API_KEY: GroqApiKeySchema,
    INSTRUCTIONS: z.string(),
});

export const AutoCommitUpdateConfigSchema = AutoCommitConfigSchema.partial();
export type AutoCommitUpdateConfig = z.infer<typeof AutoCommitUpdateConfigSchema>;
