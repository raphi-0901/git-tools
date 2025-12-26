import { IssueSummary } from '../types/IssueSummary.js'

export interface IssueService {
    getIssue(issueUrl: URL): Promise<IssueSummary | null>;
    getIssueName(): string;
}
