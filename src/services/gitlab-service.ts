import { Gitlab } from "@gitbeaker/rest";

import { IssueSummary } from "../types/IssueSummary.js";
import { IssueService } from "./issue-service.js";

type IssueUrlKind = "issues" | "work_items";

interface ParsedIssueUrl {
    iid: number;
    kind: IssueUrlKind;
    origin: string;
    projectId: string;
}

// Minimal shape of the GitLab work items REST API response we consume.
interface GitLabWorkItem {
    description?: string;
    iid: number;
    title: string;
}

export class GitLabService implements IssueService {

    constructor(private apiKey: string) { }

    async getIssue(issueUrl: URL): Promise<IssueSummary | null> {
        const parsed = parseIssueUrl(issueUrl);
        if (!parsed) {
            return null;
        }

        const { iid, kind, origin, projectId } = parsed;

        // The URL marker decides which endpoint is tried first; the other one
        // serves as fallback if the primary call fails.
        const primary =
            kind === "issues"
                ? () => this.fetchViaIssues(origin, iid, projectId)
                : () => this.fetchViaWorkItems(origin, iid, projectId);
        const fallback =
            kind === "issues"
                ? () => this.fetchViaWorkItems(origin, iid, projectId)
                : () => this.fetchViaIssues(origin, iid, projectId);

        return (
            (await this.tryFetch(primary)) ??
            (await this.tryFetch(fallback))
        );
    }

    getIssueName() {
        return "gitlab" as const;
    }

    /**
     * Fetches the issue via the classic issues REST API.
     */
    private async fetchViaIssues(origin: string, iid: number, projectId: string): Promise<IssueSummary> {
        const client = new Gitlab({
            host: origin,
            token: this.apiKey,
        });

        const issue = await client.Issues.show(iid, {
            projectId
        });

        return {
            description: issue.description || "",
            summary: issue.title,
            ticketId: String(issue.iid),
        };
    }

    /**
     * Fetches the work item via the new work items REST API.
     *
     * @see https://docs.gitlab.com/api/work_items/
     */
    private async fetchViaWorkItems(origin: string, iid: number, projectId: string): Promise<IssueSummary> {
        // https://gitlab.example.com/api/v4/projects/{project_path}/-/work_items/{iid}
        const url = `${origin}/api/v4/projects/${encodeURIComponent(projectId)}/-/work_items/${iid}`;

        const response = await fetch(url, {
            headers: { "PRIVATE-TOKEN": this.apiKey },
        });
        if (!response.ok) {
            throw new Error(`Work items request for "${url}" failed with status ${response.status}`);
        }

        const workItem = (await response.json()) as GitLabWorkItem;

        return {
            description: workItem.description || "",
            summary: workItem.title,
            ticketId: String(workItem.iid),
        };
    }

    /**
     * Runs one fetch attempt, converting every thrown error into a null result
     * so the caller can move on to the fallback endpoint.
     */
    private async tryFetch(attempt: () => Promise<IssueSummary>): Promise<IssueSummary | null> {
        try {
            return await attempt();
        } catch {
            return null;
        }
    }
}

/**
 * Parses a GitLab issue or work item URL.
 *
 * Examples:
 *   https://gitlab.com/group/subgroup/project/-/issues/42
 *   https://gitlab.com/group/subgroup/project/-/work_items/42
 */
function parseIssueUrl(issueUrl: URL): null | ParsedIssueUrl {
    const pathParts = issueUrl.pathname.split("/").filter(Boolean);

    // The URL marker decides which API to hit first.
    const issuesIndex = pathParts.indexOf("issues");
    const workItemsIndex = pathParts.indexOf("work_items");

    let kind: IssueUrlKind;
    let markerIndex: number;
    if (issuesIndex !== -1 && (workItemsIndex === -1 || issuesIndex < workItemsIndex)) {
        kind = "issues";
        markerIndex = issuesIndex;
    } else if (workItemsIndex === -1) {
        return null;
    } else {
        kind = "work_items";
        markerIndex = workItemsIndex;
    }

    // The marker must not be the very first segment; a project path has to precede it.
    if (markerIndex === 0) {
        return null;
    }

    const iidStr = pathParts[markerIndex + 1];
    const iid = Number.parseInt(iidStr, 10);
    if (Number.isNaN(iid)) {
        return null;
    }

    // The project path is everything before "/-/issues/{id}" or "/-/work_items/{id}"
    // (e.g. "group/subgroup/project")
    const projectPathParts = pathParts.slice(0, markerIndex - 1);

    return {
        iid,
        kind,
        origin: issueUrl.origin,
        projectId: projectPathParts.join("/"),
    };
}
