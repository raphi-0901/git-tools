import { IssueServiceType } from "../types/issue-service-type.js";
import { GitHubService } from "./github-service";
import { IssueService } from "./issue-service";
import { JiraServiceV2Pat } from "./jira-service-v2-pat.js";
import { JiraServiceV2 } from "./jira-service-v2.js";

// Strongly typed config for each service
type ServiceConfig =
    | { apiKey: string; email: string; type: "jira-v2"; }
    | { apiKey: string; type: "gitlab"; }
    | { apiKey: string; type: "jira-v2-pat"; }
    | { token: string; type: "github"; };

export function getService(type: IssueServiceType, config: ServiceConfig): IssueService {
    switch (type) {
        case "github": {
            if (config.type !== "github") throw new Error("Invalid config for GitHub");
            return new GitHubService(config.token);
        }

        case "gitlab": {
            if (config.type !== "gitlab") throw new Error("Invalid config for GitLab");
            return new JiraServiceV2Pat(config.apiKey);
        }

        case "jira-v2": {
            if (config.type !== "jira-v2") throw new Error("Invalid config for Jira V2");
            return new JiraServiceV2(config.apiKey, config.email);
        }

        case "jira-v2-pat": {
            if (config.type !== "jira-v2-pat") throw new Error("Invalid config for Jira V2 PAT");
            return new JiraServiceV2Pat(config.apiKey);
        }

        default: {
            throw new Error(`Unsupported service: ${type}`);
        }
    }
}
