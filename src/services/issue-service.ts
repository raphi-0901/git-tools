import {IssueSummary} from "../types/issue-summary.js";

export const ISSUE_SERVICE_TYPES = ['github', 'gitlab', 'jira-v2', 'jira-v2-pat'] as const;
export interface IssueService {
    getIssue(issueUrl: string): Promise<IssueSummary | null>;
    getIssueName(): string;
}
