"use server";

import { GoogleGenAI, Type } from "@google/genai";
import { GitHubIssue, PullRequest, Repository } from "@/types";

const getAIClient = (apiKey: string) => {
    return new GoogleGenAI({ apiKey });
};

export const analyzeIssue = async (
    issue: GitHubIssue,
    repo: Repository,
    repoStructure: string,
    geminiApiKey: string,
    feedback?: string,
    model: string = 'gemini-3-flash-preview'
) => {
    const ai = getAIClient(geminiApiKey);
    const labelNames = issue.labels.map(l => l.name).join(', ');

    const response = await ai.models.generateContent({
        model,
        contents: `You are a Senior Software Engineer. Analyze this GitHub issue in the context of the repository structure and suggest a technical fix or implementation plan.
    
    Repository: ${repo.full_name}
    Issue Title: ${issue.title}
    Issue Body: ${issue.body || "No description provided."}
    Labels: ${labelNames}

    Repository Structure (Recursive Tree):
    ${repoStructure.substring(0, 30000)}
    (Note: Structure truncated if too large)

    ${feedback ? `USER FEEDBACK ON PREVIOUS PROPOSAL:
    "${feedback}"
    Please adjust your proposal to address this feedback.` : ""}

    If you find issues that can be fixed with high confidence based on the structure (or if you can infer the changes needed), set "shouldProposeFix" to true and provide the "fix" object.
    The fix should specify the full, updated content for each file. Do not just provide diffs or snippets.
    Ensure the proposed branch name is unique and descriptive (e.g., "ai-fix/issue-${issue.number}-summary").`,
        config: {
            thinkingConfig: { thinkingBudget: 4000 },
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    analysis: { type: Type.STRING, description: 'Brief analysis of the issue context.' },
                    suggestedFix: { type: Type.STRING, description: 'Markdown formatted implementation plan or code snippet.' },
                    complexity: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
                    shouldProposeFix: { type: Type.BOOLEAN, description: 'True if a confident fix can be proposed.' },
                    fix: { // This will be the AIProposal type
                        type: Type.OBJECT,
                        properties: {
                            commitMessage: { type: Type.STRING, description: "A concise commit message for the changes, following conventional commit standards (e.g., 'fix: ...')." },
                            branchName: { type: Type.STRING, description: "A descriptive and unique branch name for the new PR, e.g., 'ai-fix/issue-${issue.number}-summary'." },
                            prTitle: { type: Type.STRING, description: "A title for the new Pull Request that implements the fix." },
                            prBody: { type: Type.STRING, description: "A markdown body for the new Pull Request, explaining what was changed and why." },
                            changes: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        filePath: { type: Type.STRING, description: "The repository path of the file to modify." },
                                        newContent: { type: Type.STRING, description: "The full, complete, new content of the file after the fix." }
                                    },
                                    required: ["filePath", "newContent"]
                                }
                            },
                        },
                        required: ["commitMessage", "branchName", "prTitle", "prBody", "changes"]
                    }
                },
                required: ['analysis', 'suggestedFix', 'complexity', 'shouldProposeFix']
            }
        }
    });

    const result = JSON.parse(response.text as string);
    // Ensure that if shouldProposeFix is true, fix object is also present
    if (result.shouldProposeFix && !result.fix) {
        console.warn("AI indicated it should propose a fix but the 'fix' object is missing.");
        result.shouldProposeFix = false; // Disable if incomplete
    }

    return result;
};

export const reviewPullRequest = async (
    pr: PullRequest,
    repo: Repository,
    geminiApiKey: string,
    model: string = 'gemini-3-pro-preview'
) => {
    const ai = getAIClient(geminiApiKey);
    // ... logic ...
    const diffData = pr.diffContent || "Diff content could not be loaded or is too large.";
    // ... context ...
    const fileContext = pr.files && pr.files.length > 0 ?
        pr.files.map(f => `
--- File: ${f.filePath} ---
${f.content}
---
`).join('\n') : "No file content available.";


    const response = await ai.models.generateContent({
        model, // Using the passed model
        contents: `You are a Senior Software Engineer. Perform a rigorous code review on this PR.
    After the review, determine if you can confidently propose a concrete fix to address any issues or improvements found.
    
    Repository: ${repo.full_name}
    PR Title: ${pr.title}
    PR Body: ${pr.body || "No description provided."}
    Diff Data: 
    \`\`\`diff
    ${diffData.substring(0, 30000)} 
    \`\`\`
    (Note: Diff truncated to 30k chars to fit context if necessary)

    Full content of changed files (if available for context):
    ${fileContext.substring(0, 80000)}
    (Note: File contents may be truncated)
    
    Check for:
    1. Logic errors
    2. Security vulnerabilities
    3. Performance bottlenecks
    4. Adherence to best practices
    5. Overall code quality and maintainability.

    If you find issues that can be fixed with high confidence, set "shouldProposeFix" to true and provide the "fix" object.
    The fix should specify the full, updated content for each file. Do not just provide diffs or snippets.
    Ensure the proposed branch name is unique and descriptive (e.g., "ai-fix/pr-${pr.number}-issue-summary").
    `,
        config: {
            thinkingConfig: { thinkingBudget: 8000 }, // Increased thinking budget
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    status: { type: Type.STRING, enum: ['approve', 'request_changes', 'comment'] },
                    feedback: { type: Type.STRING, description: 'Detailed markdown feedback for the developer.' },
                    score: { type: Type.NUMBER, description: 'A quality score from 0 to 100.' },
                    criticalIssues: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    },
                    shouldProposeFix: { type: Type.BOOLEAN, description: 'True if a confident fix can be proposed.' },
                    fix: { // This will be the AIProposal type
                        type: Type.OBJECT,
                        properties: {
                            commitMessage: { type: Type.STRING, description: "A concise commit message for the changes, following conventional commit standards (e.g., 'fix: ...')." },
                            branchName: { type: Type.STRING, description: "A descriptive and unique branch name for the new PR, e.g., 'ai-fix/pr-${pr.number}-issue-summary'." },
                            prTitle: { type: Type.STRING, description: "A title for the new Pull Request that implements the fix." },
                            prBody: { type: Type.STRING, description: "A markdown body for the new Pull Request, explaining what was changed and why." },
                            changes: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        filePath: { type: Type.STRING, description: "The repository path of the file to modify." },
                                        newContent: { type: Type.STRING, description: "The full, complete, new content of the file after the fix." }
                                    },
                                    required: ["filePath", "newContent"]
                                }
                            },
                        },
                        required: ["commitMessage", "branchName", "prTitle", "prBody", "changes"]
                    }
                },
                required: ['status', 'feedback', 'score', 'shouldProposeFix'] // fix is optional
            }
        }
    });

    const result = JSON.parse(response.text as string);
    // Ensure that if shouldProposeFix is true, fix object is also present
    if (result.shouldProposeFix && !result.fix) {
        console.warn("AI indicated it should propose a fix but the 'fix' object is missing.");
        result.shouldProposeFix = false; // Disable if incomplete
    }

    return result;
};

export const generateDocumentation = async (repoName: string, context: string, geminiApiKey: string, model: string = 'gemini-3-pro-preview') => {
    const ai = getAIClient(geminiApiKey);
    const response = await ai.models.generateContent({
        model,
        contents: `Generate comprehensive technical documentation for the repository "${repoName}".
    Use the following codebase context (README/File Summary): ${context.substring(0, 50000)}
    
    The documentation should include:
    1. System Architecture Overview
    2. Getting Started Guide
    3. API Reference (if applicable)
    4. Future Roadmap`,
        config: {
            thinkingConfig: { thinkingBudget: 5000 }
        }
    });

    return response.text;
};

export const triageIssue = async (
    issue: GitHubIssue,
    geminiApiKey: string,
    model: string = 'gemini-3-flash-preview'
) => {
    const ai = getAIClient(geminiApiKey);
    const labelNames = issue.labels.map(l => l.name).join(', ');

    const response = await ai.models.generateContent({
        model,
        contents: `You are a Senior Project Manager and Technical lead. Analyze this GitHub issue to determine if it has sufficient information for a developer to start working on it.

    Issue Title: ${issue.title}
    Issue Body: ${issue.body || "No description provided."}
    Labels: ${labelNames}
    Created By: ${issue.user.login}

    Criteria for "Sufficient Information":
    1. Clear goal or bug report.
    2. Reproduction steps (if bug).
    3. Expected vs Actual behavior (if bug).
    4. Enough context to understand the scope.

    If the issue is vague, unclear, or completely empty, set "needsInfo" to true and provide a polite, professional, and specific question to ask the user.
    If the issue is clear (even if small), set "needsInfo" to false.

    Note: If the issue body is empty or extremely short (e.g. "Fix this"), it definitely needs info.
    `,
        config: {
            thinkingConfig: { thinkingBudget: 2000 },
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    needsInfo: { type: Type.BOOLEAN, description: 'True if the issue lacks sufficient information.' },
                    missingInfoReason: { type: Type.STRING, description: 'Internal reason why info is missing.' },
                    question: { type: Type.STRING, description: 'Polite question to ask the user for more details. addressing them directly.' },
                },
                required: ['needsInfo', 'missingInfoReason', 'question']
            }
        }
    });

    const result = JSON.parse(response.text as string);
    return result;
};

export const analyzeWorkflowFailure = async (
    logs: string,
    repo: Repository,
    repoStructure: string,
    geminiApiKey: string,
    model: string = 'gemini-3-pro-preview'
) => {
    const ai = getAIClient(geminiApiKey);

    const response = await ai.models.generateContent({
        model,
        contents: `You are a Senior DevOps and Software Engineer. Analyze these CI/CD workflow logs to identify the root cause of the failure and propose a technical fix.
    
    Repository: ${repo.full_name}
    Repository Structure:
    ${repoStructure.substring(0, 20000)}

    Workflow Logs:
    \`\`\`
    ${logs.substring(0, 50000)}
    \`\`\`
    (Note: Logs/Structure truncated if too large)

    Task:
    1. Identify the specific error that caused the build/test to fail.
    2. Suggest a concrete fix in the code if possible.
    3. If you are confident, set "shouldProposeFix" to true and provide the "fix" object with full file contents.
    
    Ensure the proposed branch name is unique and descriptive (e.g., "ai-fix/ci-failure-summary").`,
        config: {
            thinkingConfig: { thinkingBudget: 8000 },
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    analysis: { type: Type.STRING, description: 'Brief analysis of why the workflow failed.' },
                    suggestedFix: { type: Type.STRING, description: 'Markdown formatted implementation plan or code snippet.' },
                    shouldProposeFix: { type: Type.BOOLEAN, description: 'True if a confident fix can be proposed.' },
                    fix: {
                        type: Type.OBJECT,
                        properties: {
                            commitMessage: { type: Type.STRING },
                            branchName: { type: Type.STRING },
                            prTitle: { type: Type.STRING },
                            prBody: { type: Type.STRING },
                            changes: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        filePath: { type: Type.STRING },
                                        newContent: { type: Type.STRING }
                                    },
                                    required: ["filePath", "newContent"]
                                }
                            }
                        },
                        required: ["commitMessage", "branchName", "prTitle", "prBody", "changes"]
                    }
                },
                required: ['analysis', 'suggestedFix', 'shouldProposeFix']
            }
        }
    });

    const result = JSON.parse(response.text as string);
    if (result.shouldProposeFix && !result.fix) {
        result.shouldProposeFix = false;
    }
    return result;
};
