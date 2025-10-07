import {IssueServiceConfig} from "./issue-service-type.js";

export type AutoBranchConfig = {
    GROQ_API_KEY: string;
    HOSTNAMES: Record<string, IssueServiceConfig>;
}
