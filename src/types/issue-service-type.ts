export const SERVICE_DEFINITIONS = {
    github: {
        requiredFields: ["type", "token", "instructions"] as const,
    },
    gitlab: {
        requiredFields: ["type", "token", "instructions"] as const,
    },
    "jira-v2": {
        requiredFields: ["type", "email", "token", "instructions"] as const,
    },
    "jira-v2-pat": {
        requiredFields: ["type", "token", "instructions"] as const,
    },
} as const;

export type IssueServiceType = keyof typeof SERVICE_DEFINITIONS;

export const ISSUE_SERVICE_TYPES = Object.keys(SERVICE_DEFINITIONS) as IssueServiceType[];

export type IssueServiceConfig = {
    [K in IssueServiceType]: {
    [F in (typeof SERVICE_DEFINITIONS[K]["requiredFields"][number])]: string;
} & { type: K };
}[IssueServiceType];
