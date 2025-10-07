import {Version2Client} from "jira.js";

import {IssueSummary} from "../types/issue-summary.js";
import {IssueService} from "./issue-service.js";

export class JiraV2Service implements IssueService {
    constructor(private apiKey: string, private email: string) {}

    async getIssue(issueUrl: URL): Promise<IssueSummary | null> {
        console.log('issueUrl :>>', issueUrl);

        // const client = new Version2Client({
        //     authentication: { basic: { apiToken: this.apiKey, email: this.email } },
        //     host,
        // });
        //
        // try {
        //     const issue = await client.issues.getIssue({ issueIdOrKey: issueId });
        //     return {
        //         description: issue.fields.description || "",
        //         summary: issue.fields.summary,
        //         ticketId: issue.key,
        //     };
        // } catch {
        //     return null;
        // }
        return null;
    }

    getIssueName() {
        return "jira-v2" as const;
    }
}
