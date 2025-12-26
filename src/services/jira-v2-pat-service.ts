import { Version2Client } from 'jira.js'

import { IssueSummary } from '../types/IssueSummary.js'
import { IssueService } from './issue-service.js'

export class JiraV2PatService implements IssueService {
    constructor(private apiKey: string) {}

    async getIssue(issueUrl: URL): Promise<IssueSummary | null> {
        const client = new Version2Client({
            authentication: {
 oauth2: {
 accessToken: this.apiKey 
} 
},
            host: issueUrl.origin,
        })

        const issueId = issueUrl.pathname.split('/').at(-1) ?? issueUrl.toString()

        try {
            const issue = await client.issues.getIssue({
 issueIdOrKey: issueId 
})
            return {
                description: issue.fields.description || '',
                summary: issue.fields.summary,
                ticketId: issue.key,
            }
        } catch {
            return null
        }
    }

    getIssueName() {
        return 'jira-v2-pat' as const
    }
}
