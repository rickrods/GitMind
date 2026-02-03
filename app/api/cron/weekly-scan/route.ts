
import { NextRequest, NextResponse } from 'next/server';
import { GitHubService } from '@/utils/github';
import { GitHubIssue } from '@/types';

// Can be set to run weekly via cron
export async function POST(req: NextRequest) {
    const { owner, repo, token } = await req.json();

    if (!owner || !repo || !token) {
        return NextResponse.json({ error: 'Missing required parameters: owner, repo, token' }, { status: 400 });
    }

    const github = new GitHubService(token);

    try {
        const issues = await github.fetchIssues(owner, repo);

        // Find issues waiting for info
        const waitingIssues = issues.filter((issue: GitHubIssue) =>
            issue.labels.some(l => l.name === 'needs-more-info')
        );

        const results = [];

        for (const issue of waitingIssues) {
            console.log(`Checking issue #${issue.number} for updates...`);

            const comments = await github.fetchIssueComments(owner, repo, issue.number);

            if (comments.length > 0) {
                const lastComment = comments[comments.length - 1];
                const botName = 'gemini-coder-bot'; // Or whatever the bot user is known as
                // Or checking if the last comment is NOT from us (needs identifying who "us" is, usually by token owner, but let's assume if the user who opened the issue commented, it's a reply)

                // Heuristic: If the last commenter is the issue creator, it's likely a response.
                if (lastComment.user.login === issue.user.login) {
                    console.log(`User responded to issue #${issue.number}. Removing label.`);

                    // Remove label
                    await github.removeLabel(owner, repo, issue.number, 'needs-more-info');

                    // Optionally add a "Thanks" comment or re-label as "needs-triage"
                    await github.addComment(owner, repo, issue.number, "Thanks for the update! I've removed the 'needs-more-info' label. The team will review this shortly.");

                    results.push({ issue: issue.number, status: 'updated', action: 'removed-label' });
                } else {
                    results.push({ issue: issue.number, status: 'no-user-response' });
                }
            }
        }

        return NextResponse.json({ processed: results.length, results });

    } catch (error: any) {
        console.error("Weekly scan error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
