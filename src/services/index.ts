import {IssueServiceConfig, IssueServiceType, SERVICE_DEFINITIONS} from "../types/issue-service-type.js";
import {GitHubService} from "./github-service.js";
import {GitLabService} from "./gitlab-service.js";
import {IssueService} from "./issue-service.js";
import {JiraV2PatService} from "./jira-v2-pat-service.js";
import {JiraV2Service} from "./jira-v2-service.js";

export const REQUIRED_FIELDS_BY_TYPE = Object.fromEntries(
    Object.entries(SERVICE_DEFINITIONS).map(([key, val]) => [key, [...val.requiredFields]])
);

export function getService(type: IssueServiceType, config: IssueServiceConfig): IssueService | null {
    switch (type) {
        case "github": {
            if (config.type !== "github") {
                return null;
            }

            return new GitHubService(config.token);
        }

        case "gitlab": {
            if (config.type !== "gitlab") {
                return null;
            }

            return new GitLabService(config.token);
        }

        case "jira-v2": {
            if (config.type !== "jira-v2") {
                return null;
            }

            return new JiraV2Service(config.token, config.email);
        }

        case "jira-v2-pat": {
            if (config.type !== "jira-v2-pat") {
                return null;
            }

            return new JiraV2PatService(config.token);
        }

        default: {
            return null;
        }
    }
}
