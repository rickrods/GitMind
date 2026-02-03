
import { NextRequest, NextResponse } from 'next/server';
import { GitHubService } from '@/utils/github';
import { triageIssue } from '@/app/actions/gemini';
import { GitHubIssue } from '@/types';

// This route can be triggered via Cron or manually
export async function POST(req: NextRequest) {
    // In a real app, verify a secret token for Cron/Webhooks
    // const authHeader = req.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) { return new NextResponse('Unauthorized', { status: 401 }); }

    const { owner, repo, token, geminiKey } = await req.json();

    if (!owner || !repo || !token || !geminiKey) {
        return NextResponse.json({ error: 'Missing required parameters: owner, repo, token, geminiKey' }, { status: 400 });
    }

    const github = new GitHubService(token);

    try {
        const issues = await github.fetchIssues(owner, repo);

        // Filter issues that need triage:
        // 1. Don't have 'needs-more-info'
        // 2. Don't have 'triage-complete' (optional, if we want to mark them done)
        // 3. Are open
        const untriagedIssues = issues.filter((issue: GitHubIssue) =>
            !issue.labels.some(l => l.name === 'needs-more-info' || l.name === 'triage-complete') &&
            issue.state === 'open'
        );

        const results = [];

        for (const issue of untriagedIssues) {
            console.log(`Analyzing issue #${issue.number}: ${issue.title}`);
            const analysis = await triageIssue(issue, geminiKey);

            if (analysis.needsInfo) {
                console.log(`Issue #${issue.number} needs info: ${analysis.question}`);

                // 1. Add Label
                await github.addLabel(owner, repo, issue.number, 'needs-more-info');

                // 2. Add Comment
                const commentBody = `Hi @${issue.user.login}, thanks for opening this issue! \n\n${analysis.question}\n\n*Determined by Gemini Triage AI*`;
                await github.addComment(owner, repo, issue.number, commentBody);

                results.push({ issue: issue.number, status: 'needs-info', reason: analysis.missingInfoReason });
            } else {
                console.log(`Issue #${issue.number} has sufficient info.`);
                // Optionally mark as triaged so we don't re-scan
                await github.addLabel(owner, repo, issue.number, 'triage-complete');
                results.push({ issue: issue.number, status: 'triaged' });
            }
        }

        return NextResponse.json({ processed: results.length, results });

    } catch (error: any) {
        console.error("Triage error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
