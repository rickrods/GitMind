
import { Repository, GitHubIssue, PullRequest, WorkflowRun } from "@/types";

const GITHUB_API_BASE = 'https://api.github.com';

export class GitHubService {
    private token: string;

    constructor(token: string) {
        this.token = token;
    }

    private get headers() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28'
        };
    }

    async fetchRepoDetails(owner: string, repo: string): Promise<Repository> {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
            headers: this.headers
        });
        if (!res.ok) throw new Error(`Failed to fetch repo: ${res.statusText}`);
        return res.json();
    }

    async fetchIssues(owner: string, repo: string): Promise<GitHubIssue[]> {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?state=open&per_page=20`, {
            headers: this.headers
        });
        if (!res.ok) throw new Error('Failed to fetch issues');
        // GitHub API returns PRs as issues, filter them out if "pull_request" key exists
        const data = await res.json();
        return data.filter((item: any) => !item.pull_request);
    }

    async fetchPullRequests(owner: string, repo: string): Promise<PullRequest[]> {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls?state=open&per_page=20`, {
            headers: this.headers
        });
        if (!res.ok) throw new Error('Failed to fetch PRs');
        return res.json();
    }

    async fetchPullRequest(owner: string, repo: string, prNumber: number): Promise<PullRequest> {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}`, {
            headers: this.headers
        });
        if (!res.ok) throw new Error(`Failed to fetch PR #${prNumber}`);
        return res.json();
    }

    async fetchPRDiff(diffUrl: string): Promise<string> {
        const res = await fetch(diffUrl, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Accept': 'application/vnd.github.v3.diff'
            }
        });
        if (!res.ok) return "Failed to load diff content.";
        return res.text();
    }

    async fetchWorkflows(owner: string, repo: string): Promise<WorkflowRun[]> {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs?per_page=10`, {
            headers: this.headers
        });
        if (!res.ok) throw new Error('Failed to fetch workflows');
        const data = await res.json();
        return data.workflow_runs;
    }

    async fetchWorkflowJobs(owner: string, repo: string, runId: number): Promise<any[]> {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs/${runId}/jobs`, {
            headers: this.headers
        });
        if (!res.ok) throw new Error(`Failed to fetch workflow jobs: ${res.statusText}`);
        const data = await res.json();
        return data.jobs;
    }

    async fetchJobLogs(owner: string, repo: string, jobId: number): Promise<string> {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/jobs/${jobId}/logs`, {
            headers: this.headers
        });
        if (!res.ok) throw new Error(`Failed to fetch job logs: ${res.statusText}`);
        return res.text();
    }

    async fetchReadme(owner: string, repo: string): Promise<string> {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`, {
            headers: { ...this.headers, 'Accept': 'application/vnd.github.raw' }
        });
        if (!res.ok) throw new Error('Failed to fetch README');
        return res.text();
    }

    async fetchFileContent(owner: string, repo: string, path: string, ref: string): Promise<{ content: string, sha: string }> {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}?ref=${ref}`, {
            headers: this.headers
        });
        if (!res.ok) {
            if (res.status === 404) { // File not found is a valid scenario
                return { content: '', sha: '' };
            }
            throw new Error(`Failed to fetch file content for ${path}: ${res.statusText}`);
        }
        const data = await res.json();
        // The content is base64 encoded. Decode it.
        // Use Buffer in Node.js (server) and atob in browser (client)
        const content = typeof window !== 'undefined' ? atob(data.content) : Buffer.from(data.content, 'base64').toString('utf-8');
        return { content, sha: data.sha };
    }

    async getBranch(owner: string, repo: string, branch: string): Promise<any> {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/branches/${branch}`, {
            headers: this.headers
        });
        if (!res.ok) throw new Error(`Failed to get branch ${branch}: ${res.statusText}`);
        return res.json();
    }

    async createBranch(owner: string, repo: string, newBranchName: string, sha: string): Promise<any> {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({
                ref: `refs/heads/${newBranchName}`,
                sha
            })
        });
        if (!res.ok) throw new Error(`Failed to create branch: ${await res.text()}`);
        return res.json();
    }

    async createPullRequest(owner: string, repo: string, title: string, body: string, head: string, base: string): Promise<PullRequest> {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({
                title,
                body,
                head,
                base
            })
        });
        if (!res.ok) throw new Error(`Failed to create pull request: ${await res.text()}`);
        return res.json();
    }

    // Git Data API methods
    async createBlob(owner: string, repo: string, content: string): Promise<{ sha: string, url: string }> {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/blobs`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({
                content: content,
                encoding: 'utf-8'
            })
        });
        if (!res.ok) throw new Error(`Failed to create blob: ${await res.text()}`);
        return res.json();
    }

    async getCommit(owner: string, repo: string, sha: string): Promise<any> {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits/${sha}`, { headers: this.headers });
        if (!res.ok) throw new Error(`Failed to get commit ${sha}: ${await res.text()}`);
        return res.json();
    }

    async createTree(owner: string, repo: string, base_tree_sha: string, tree_items: { path: string, mode: string, type: string, sha: string }[]): Promise<{ sha: string, url: string }> {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({
                base_tree: base_tree_sha,
                tree: tree_items
            })
        });
        if (!res.ok) throw new Error(`Failed to create tree: ${await res.text()}`);
        return res.json();
    }

    async createCommit(owner: string, repo: string, message: string, tree_sha: string, parent_sha: string): Promise<{ sha: string, url: string }> {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({
                message,
                tree: tree_sha,
                parents: [parent_sha]
            })
        });
        if (!res.ok) throw new Error(`Failed to create commit: ${await res.text()}`);
        return res.json();
    }

    async updateRef(owner: string, repo: string, ref: string, sha: string): Promise<any> {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs/${ref}`, { // Corrected path for ref
            method: 'PATCH',
            headers: this.headers,
            body: JSON.stringify({ sha, force: false })
        });
        if (!res.ok) throw new Error(`Failed to update ref ${ref}: ${await res.text()}`);
        return res.json();
    }

    async getRepoStructure(owner: string, repo: string, ref: string): Promise<{ path: string, type: string, sha: string }[]> { // Added sha to return
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`, {
            headers: this.headers,
        });
        if (!res.ok) {
            throw new Error(`Failed to get repository structure: ${res.statusText}`);
        }
        const data = await res.json();
        return data.tree.map((item: any) => ({ path: item.path, type: item.type, sha: item.sha }));
    }

    async addLabel(owner: string, repo: string, issueNumber: number, label: string): Promise<any> {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}/labels`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ labels: [label] })
        });
        if (!res.ok) throw new Error(`Failed to add label: ${await res.text()}`);
        return res.json();
    }

    async removeLabel(owner: string, repo: string, issueNumber: number, label: string): Promise<any> {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}/labels/${label}`, {
            method: 'DELETE',
            headers: this.headers
        });
        if (!res.ok && res.status !== 404) throw new Error(`Failed to remove label: ${await res.text()}`);
        // 404 means label didn't exist, which is fine
        return true;
    }

    async addComment(owner: string, repo: string, issueNumber: number, body: string): Promise<any> {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ body })
        });
        if (!res.ok) throw new Error(`Failed to add comment: ${await res.text()}`);
        return res.json();
    }

    async fetchIssueComments(owner: string, repo: string, issueNumber: number): Promise<any[]> {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
            headers: this.headers
        });
        if (!res.ok) throw new Error(`Failed to fetch comments: ${await res.text()}`);
        return res.json();
    }
}

export const parseGitHubUrl = (url: string): { owner: string, repo: string } | null => {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts.length >= 2) {
            return { owner: pathParts[0], repo: pathParts[1] };
        }
        return null;
    } catch (e) {
        return null;
    }
};
