import * as z from "zod";

export const AutoCommitConfigSchema = z.strictObject({
    EXAMPLES: z.array(z.string()),
    GROQ_API_KEY: z.string(),
    INSTRUCTIONS: z.string(),
});

export const AutoCommitUpdateConfigSchema = AutoCommitConfigSchema.partial();

export type AutoCommitConfig = z.infer<typeof AutoCommitConfigSchema>;
export type AutoCommitUpdateConfig = z.infer<typeof AutoCommitUpdateConfigSchema>;
export const AutoCommitConfigKeys = Object.keys(AutoCommitConfigSchema.shape) as (keyof AutoCommitConfig)[];
export const AutoCommitExampleSchema = z.string();
