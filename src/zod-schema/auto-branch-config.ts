import * as z from "zod";

import { GroqApiKeySchema } from "./groqApiKey.js";

export const AutoBranchConfigSchema = z.strictObject({
    GROQ_API_KEY: GroqApiKeySchema,
    HOSTNAMES: z.record(
        z.hostname(),
        z.discriminatedUnion("type", [
            // GitHub
            z.strictObject({
                examples: z.array(z.string()),
                instructions: z.string(),
                token: z.string(),
                type: z.literal("github"),
            }),
            // GitLab
            z.strictObject({
                examples: z.array(z.string()),
                instructions: z.string(),
                token: z.string(),
                type: z.literal("gitlab"),
            }),
            // Jira (PAT)
            z.strictObject({
                examples: z.array(z.string()),
                instructions: z.string(),
                token: z.string(),
                type: z.literal("jira-v2-pat"),
            }),
            // Jira (cloud)
            z.strictObject({
                email: z.email(),
                examples: z.array(z.string()),
                instructions: z.string(),
                token: z.string(),
                type: z.literal("jira-v2"),
            }),
        ])
    ),
});

export const AutoBranchUpdateConfigSchema = z.strictObject({
    GROQ_API_KEY: GroqApiKeySchema,
    HOSTNAMES: z.record(
        z.hostname(),
        z.discriminatedUnion("type", [
            // GitHub
            z.strictObject({
                examples: z.array(z.string()),
                instructions: z.string(),
                token: z.string(),
                type: z.literal("github"),
            }).partial(),
            // GitLab
            z.strictObject({
                examples: z.array(z.string()),
                instructions: z.string(),
                token: z.string(),
                type: z.literal("gitlab"),
            }).partial(),
            // Jira (PAT)
            z.strictObject({
                examples: z.array(z.string()),
                instructions: z.string(),
                token: z.string(),
                type: z.literal("jira-v2-pat"),
            }).partial(),
            // Jira (cloud)
            z.strictObject({
                email: z.email(),
                examples: z.array(z.string()),
                instructions: z.string(),
                token: z.string(),
                type: z.literal("jira-v2"),
            }).partial(),
        ])
    ).optional(),
}).partial();

export type AutoBranchConfig = z.infer<typeof AutoBranchConfigSchema>;
export type AutoBranchUpdateConfig = z.infer<typeof AutoBranchUpdateConfigSchema>;
export type AutoBranchServiceUnionConfig = AutoBranchConfig["HOSTNAMES"];
export type AutoBranchServiceConfig = AutoBranchServiceUnionConfig[string];
export type AutoBranchServiceTypesConfig = AutoBranchServiceConfig["type"];

const HostnamesUnionSchema = AutoBranchConfigSchema.shape.HOSTNAMES.def.valueType;
export const AutoBranchServiceTypeValues = HostnamesUnionSchema.options.map(
    (opt) => (opt.shape.type).value
);
