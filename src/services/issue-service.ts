import { IssueSummary } from "../types/issue-summary.js";

export interface IssueService {
    getIssue(issueUrl: URL): Promise<IssueSummary | null>;
    getIssueName(): string;
}
