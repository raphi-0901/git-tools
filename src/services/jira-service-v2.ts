import { Version2Client } from "jira.js";

import {IssueSummary} from "../types/issue-summary.js";
import { IssueService } from "./issue-service";

export class JiraServiceV2 implements IssueService {
    constructor(private apiKey: string, private email: string) {}

    async getIssue(issueUrl: string): Promise<IssueSummary | null> {
        // pass all values from url
        return null;
        // const fetchIssue = async (auth: Authentication) => {
        //     const client = new Version2Client({
        //         authentication: auth,
        //         baseRequestConfig: { timeout: 5000 },
        //         host
        //     });
        //     return client.issues.getIssue({ issueIdOrKey: issueId });
        // };


        // const pathParts = issueIdOrUrl.split("/");
        // const issueId = pathParts.at(-1) ?? issueIdOrUrl;
        // const host = `https://${this.hostname}`;

        // const client = new Version2Client({
        //     authentication: { basic: { apiToken: this.apiKey, email: this.email } },
        //     host,
        // });
        //
        // try {
        //     const issue = await client.issues.getIssue({ issueIdOrKey: issueId });
        //     return {
        //         ticketId: issue.key,
        //         summary: issue.fields.summary,
        //         description: issue.fields.description || "",
        //     };
        // } catch {
        //     return null;
        // }
    }

    getIssueName(): string {
        return "jira-v2";
    }
}
