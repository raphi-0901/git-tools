import {IssueSummary} from "../types/issue-summary.js";
import { IssueService } from "./issue-service.js";

export class GitHubService implements IssueService {
    constructor(private token: string) {}

    async getIssue(issueUrl: string): Promise<IssueSummary | null> {
        // implementation...
        return null
    }

    getIssueName(): string {
        return "github";
    }
}
