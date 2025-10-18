import * as z from "zod";

export const AutoBranchConfigSchema = z.strictObject({
    GROQ_API_KEY: z.string(),
    HOSTNAMES: z.record(
        z.hostname(),
        z.discriminatedUnion("type", [
            // GitHub
            z.strictObject({
                instructions: z.string(),
                token: z.string(),
                type: z.literal("github"),
            }),
            // GitLab
            z.strictObject({
                instructions: z.string(),
                token: z.string(),
                type: z.literal("gitlab"),
            }),
            // Jira (PAT)
            z.strictObject({
                instructions: z.string(),
                token: z.string(),
                type: z.literal("jira-v2-pat"),
            }),
            // Jira (cloud)
            z.strictObject({
                email: z.email(),
                instructions: z.string(),
                token: z.string(),
                type: z.literal("jira-v2"),
            }),
        ])
    ),
});

export const AutoBranchUpdateConfigSchema = z.strictObject({
    GROQ_API_KEY: z.string(),
    HOSTNAMES: z.record(
        z.hostname(),
        z.discriminatedUnion("type", [
            // GitHub
            z.strictObject({
                instructions: z.string(),
                token: z.string(),
                type: z.literal("github"),
            }).partial(),
            // GitLab
            z.strictObject({
                instructions: z.string(),
                token: z.string(),
                type: z.literal("gitlab"),
            }).partial(),
            // Jira (PAT)
            z.strictObject({
                instructions: z.string(),
                token: z.string(),
                type: z.literal("jira-v2-pat"),
            }).partial(),
            // Jira (cloud)
            z.strictObject({
                email: z.email(),
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

// type KeysOfUnion<T> = T extends unknown ? keyof T : never;
// export type ConfigKeys = Extract<KeysOfUnion<AutoBranchServiceConfig>, string>;

export const AutoBranchConfigKeys = Object.keys(AutoBranchConfigSchema.shape) as (keyof AutoBranchConfig)[];

const HostnamesUnionSchema = AutoBranchConfigSchema.shape.HOSTNAMES.def.valueType;
export const AutoBranchServiceTypeValues = HostnamesUnionSchema.options.map(
    (opt) => (opt.shape.type).value
);
