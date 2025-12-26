import { Octokit } from '@octokit/rest'

import { IssueSummary } from '../types/IssueSummary.js'
import { IssueService } from './issue-service.js'

export class GitHubService implements IssueService {
    private client: Octokit

    constructor(private apiKey: string) {
        this.client = new Octokit({
            auth: this.apiKey,
            log: {
                debug() {},
                error() {},
                info() {},
                warn() {},
            },
        })
    }

    async getIssue(issueUrl: URL): Promise<IssueSummary | null> {
        try {
            const pathParts = issueUrl.pathname.split('/').filter(Boolean)
            if (pathParts.length < 4) {
                return null
            }

            const [owner, repo, , issueNumberStr] = pathParts
            const issueNumber = Number.parseInt(issueNumberStr, 10)
            if (Number.isNaN(issueNumber)) {
                return null
            }

            // Fetch issue using Octokit
            const { data } = await this.client.issues.get({
                // eslint-disable-next-line camelcase
                issue_number: issueNumber,
                owner,
                repo,
            })

            return {
                description: data.body || '',
                summary: data.title,
                ticketId: String(data.number),
            }
        } catch {
            return null
        }
    }

    getIssueName() {
        return 'github' as const
    }
}
