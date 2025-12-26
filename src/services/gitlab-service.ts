import { Gitlab } from '@gitbeaker/rest'

import { IssueSummary } from '../types/IssueSummary.js'
import { IssueService } from './issue-service.js'

export class GitLabService implements IssueService {

    constructor(private apiKey: string) {}

    async getIssue(issueUrl: URL): Promise<IssueSummary | null> {
        try {
            // Example: https://gitlab.com/group/project/-/issues/42
            const pathParts = issueUrl.pathname.split('/').filter(Boolean)
            const issueIndex = pathParts.indexOf('issues')
            if (issueIndex === -1 || issueIndex === 0) {
                return null
            }

            const issueNumberStr = pathParts[issueIndex + 1]
            const issueNumber = Number.parseInt(issueNumberStr, 10)
            if (Number.isNaN(issueNumber)) {
                return null
            }

            // The project path is everything before "/-/issues/{id}"
            // (e.g. "group/subgroup/project")
            const projectPathParts = pathParts.slice(0, issueIndex - 1)
            const projectId = projectPathParts.join('/')

            const client = new Gitlab({
                host: issueUrl.origin,
                token: this.apiKey,
            })

            // Fetch issue using GitLab API
            const issue = await client.Issues.show(issueNumber, {
                projectId
            })

            return {
                description: issue.description || '',
                summary: issue.title,
                ticketId: String(issue.iid),
            }
        } catch {
            return null
        }
    }

    getIssueName() {
        return 'gitlab' as const
    }
}
