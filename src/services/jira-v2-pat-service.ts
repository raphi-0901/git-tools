import {IssueSummary} from "../types/issue-summary.js";
import {IssueService} from "./issue-service.js";

export class JiraV2PatService implements IssueService {
    constructor(private apiKey: string) {}

    async getIssue(issueUrl: URL): Promise<IssueSummary | null> {
        // pass all values from url
        return null;

        // const pathParts = issueUrl.split("/");
        // const issueId = pathParts.at(-1) ?? issueUrl;
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

    getIssueName() {
        return "jira-v2-pat" as const;
    }
}
