"use server";

import { createSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { encodedRedirect } from "@/utils/redirect";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const client = await createSupabaseClient();

  const url = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/`
    : "http://localhost:3000/";

  const { error } = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: url,
    },
  });

  if (error) {
    return encodedRedirect("error", "/sign-up", error.message);
  }

  return redirect("/settings");
};

export async function signOutAction() {
  const client = await createSupabaseClient();
  await client.auth.signOut();
  return redirect("/sign-in");
};

export async function getUser() {
  const client = await createSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  return user;
}

// Secure Settings Actions
import { encrypt, decrypt } from "@/utils/encryption";

export async function saveEncryptedSecret(type: 'github_pat' | 'gemini_api_key', value: string) {
  const user = await getUser();
  if (!user) throw new Error("Not authenticated");

  const client = await createSupabaseClient();
  const encryptedValue = await encrypt(value);

  const { error } = await client
    .from('profiles')
    .upsert({
      id: user.id,
      [type]: encryptedValue,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function saveProfileSetting(key: string, value: string) {
  const user = await getUser();
  if (!user) throw new Error("Not authenticated");

  const client = await createSupabaseClient();
  const { error } = await client
    .from('profiles')
    .upsert({
      id: user.id,
      [key]: value,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function getProfileSettings() {
  const user = await getUser();
  if (!user) return null;

  const client = await createSupabaseClient();
  const { data, error } = await client
    .from('profiles')
    .select('github_pat, gemini_api_key, gemini_model')
    .eq('id', user.id)
    .single();

  if (error) return null;

  return {
    github_pat: data.github_pat ? await decrypt(data.github_pat) : null,
    gemini_api_key: data.gemini_api_key ? await decrypt(data.gemini_api_key) : null,
    gemini_model: data.gemini_model
  };
}

// Issue Analysis Actions

export async function saveIssueAnalysis(
  repoOwner: string,
  repoName: string,
  issueNumber: number,
  analysis: string,
  suggestedFix?: string,
  needsInfo: boolean = false,
  aiProposal?: any // Using any for flexibility or import AIProposal type
) {
  const user = await getUser();
  if (!user) throw new Error("Not authenticated");

  const client = await createSupabaseClient();
  const { error } = await client
    .from('issue_analyses')
    .upsert({
      repo_owner: repoOwner,
      repo_name: repoName,
      issue_number: issueNumber,
      analysis,
      suggested_fix: suggestedFix,
      needs_info: needsInfo,
      ai_proposal: aiProposal,
      updated_at: new Date().toISOString()
    }, { onConflict: 'repo_owner,repo_name,issue_number' });

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function getIssueAnalyses(repoOwner: string, repoName: string) {
  const user = await getUser();
  if (!user) return [];

  const client = await createSupabaseClient();
  const { data, error } = await client
    .from('issue_analyses')
    .select('*')
    .eq('repo_owner', repoOwner)
    .eq('repo_name', repoName);

  if (error) {
    console.error("Error fetching analyses:", error);
    return [];
  }
  return data;
}

// PR Analysis Actions
export async function savePRAnalysis(
  repoOwner: string,
  repoName: string,
  prNumber: number,
  analysis: any,
  aiProposal?: any
) {
  const user = await getUser();
  if (!user) throw new Error("Not authenticated");

  const client = await createSupabaseClient();
  const { error } = await client
    .from('pr_analyses')
    .upsert({
      repo_owner: repoOwner,
      repo_name: repoName,
      pr_number: prNumber,
      analysis,
      ai_proposal: aiProposal,
      updated_at: new Date().toISOString()
    }, { onConflict: 'repo_owner,repo_name,pr_number' });

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function getPRAnalyses(repoOwner: string, repoName: string) {
  const user = await getUser();
  if (!user) return [];

  const client = await createSupabaseClient();
  const { data, error } = await client
    .from('pr_analyses')
    .select('*')
    .eq('repo_owner', repoOwner)
    .eq('repo_name', repoName);

  if (error) {
    console.error("Error fetching PR analyses:", error);
    return [];
  }
  return data;
}

// CI Analysis Actions
export async function saveCIAnalysis(
  repoOwner: string,
  repoName: string,
  runId: number,
  analysis: string,
  suggestedFix: string,
  aiProposal?: any
) {
  const user = await getUser();
  if (!user) throw new Error("Not authenticated");

  const client = await createSupabaseClient();
  const { error } = await client
    .from('ci_analyses')
    .upsert({
      repo_owner: repoOwner,
      repo_name: repoName,
      run_id: runId,
      analysis,
      suggested_fix: suggestedFix,
      ai_proposal: aiProposal,
      updated_at: new Date().toISOString()
    }, { onConflict: 'repo_owner,repo_name,run_id' });

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function getCIAnalyses(repoOwner: string, repoName: string) {
  const user = await getUser();
  if (!user) return [];

  const client = await createSupabaseClient();
  const { data, error } = await client
    .from('ci_analyses')
    .select('*')
    .eq('repo_owner', repoOwner)
    .eq('repo_name', repoName);

  if (error) {
    console.error("Error fetching CI analyses:", error);
    return [];
  }
  return data;
}

// Documentation Persistence Actions
export async function saveRepoDocumentation(repoOwner: string, repoName: string, content: string) {
  const user = await getUser();
  if (!user) throw new Error("Not authenticated");

  const client = await createSupabaseClient();
  const { error } = await client
    .from('repo_documentation')
    .upsert({
      repo_owner: repoOwner,
      repo_name: repoName,
      content,
      updated_at: new Date().toISOString()
    }, { onConflict: 'repo_owner,repo_name' });

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function getRepoDocumentation(repoOwner: string, repoName: string) {
  const user = await getUser();
  if (!user) return null;

  const client = await createSupabaseClient();
  const { data, error } = await client
    .from('repo_documentation')
    .select('content')
    .eq('repo_owner', repoOwner)
    .eq('repo_name', repoName)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // PGRST116 is "No rows found"
      console.error("Error fetching repo docs:", error);
    }
    return null;
  }
  return data.content;
}

// CI Analysis Actions
// CI & PR Analysis Actions
import { analyzeWorkflowFailure, reviewPullRequest } from "@/app/actions/gemini";
import { GitHubService } from "@/utils/github";
import { AIProposal, Repository, PullRequest } from "@/types";

export async function analyzePullRequestAction(owner: string, repo: string, prNumber: number) {
  const user = await getUser();
  if (!user) throw new Error("Not authenticated");

  const settings = await getProfileSettings();
  if (!settings?.github_pat || !settings?.gemini_api_key) {
    throw new Error("GitHub PAT or Gemini API Key missing.");
  }

  const gh = new GitHubService(settings.github_pat);

  // 1. Fetch PR details
  const pr = await gh.fetchPullRequest(owner, repo, prNumber);

  // 2. Fetch diff content (Server-side fetch avoids CORS)
  const diffContent = await gh.fetchPRDiff(pr.diff_url);

  // 3. Parse changed file paths from the diff
  const changedFilePaths: string[] = [];
  const diffLines = diffContent.split('\n');
  const diffFileRegex = /^diff --git a\/(.*?) b\/(.*?)$/;
  for (const line of diffLines) {
    const match = line.match(diffFileRegex);
    if (match && match[1]) {
      changedFilePaths.push(match[1]);
    }
  }

  // 4. Fetch content for each changed file
  const fileContents = await Promise.all(
    changedFilePaths.map(async (path) => {
      try {
        const { content } = await gh.fetchFileContent(owner, repo, path, pr.head.ref);
        return { filePath: path, content };
      } catch (fileError) {
        console.warn(`Could not fetch content for file ${path}:`, fileError);
        return { filePath: path, content: `Error: Could not fetch content. ${fileError instanceof Error ? fileError.message : String(fileError)}` };
      }
    })
  );

  const repoDetails = await gh.fetchRepoDetails(owner, repo);
  const prWithDiffAndFiles = { ...pr, diffContent, files: fileContents };

  // 5. Run AI Review
  const reviewResult = await reviewPullRequest(
    prWithDiffAndFiles,
    repoDetails,
    settings.gemini_api_key,
    settings.gemini_model || 'gemini-3-pro-preview'
  );

  // 6. Save analysis to database
  await savePRAnalysis(
    owner,
    repo,
    pr.number,
    reviewResult,
    reviewResult.fix
  );

  return {
    reviewResult,
    diffContent,
    fileContents
  };
}

export async function analyzeWorkflowAction(owner: string, repo: string, runId: number) {
  const user = await getUser();
  if (!user) throw new Error("Not authenticated");

  const settings = await getProfileSettings();
  if (!settings?.github_pat || !settings?.gemini_api_key) {
    throw new Error("GitHub PAT or Gemini API Key missing in settings.");
  }

  const gh = new GitHubService(settings.github_pat);
  const jobs = await gh.fetchWorkflowJobs(owner, repo, runId);
  const failedJob = jobs.find((j: any) => j.conclusion === 'failure');

  if (!failedJob) {
    return { analysis: "No failed job found for this run.", suggestedFix: "", shouldProposeFix: false };
  }

  const logs = await gh.fetchJobLogs(owner, repo, failedJob.id);
  const repoDetails = await gh.fetchRepoDetails(owner, repo);
  const structure = await gh.getRepoStructure(owner, repo, repoDetails.default_branch);
  const structureString = structure.map(item => `${item.type === 'tree' ? '[DIR]' : '[FILE]'} ${item.path}`).join('\n');

  const result = await analyzeWorkflowFailure(
    logs,
    repoDetails,
    structureString,
    settings.gemini_api_key,
    settings.gemini_model || 'gemini-3-pro-preview'
  );

  // Save analysis to database
  try {
    await saveCIAnalysis(
      owner,
      repo,
      runId,
      result.analysis,
      result.suggestedFix,
      result.fix
    );
  } catch (err) {
    console.error("Failed to save CI analysis:", err);
  }

  return result;
}

export async function applyFixAction(repo: Repository, proposal: AIProposal) {
  const user = await getUser();
  if (!user) throw new Error("Not authenticated");

  const settings = await getProfileSettings();
  if (!settings?.github_pat) throw new Error("GitHub PAT missing.");

  const gh = new GitHubService(settings.github_pat);
  const { owner, name: repoName, default_branch } = repo;

  try {
    // 1. Get default branch SHA
    const baseBranch = await gh.getBranch(owner.login, repoName, default_branch);
    const baseSha = baseBranch.commit.sha;

    // 2. Create new branch
    await gh.createBranch(owner.login, repoName, proposal.branchName, baseSha);

    // 3. Create blobs and tree for changes
    const treeItems = await Promise.all(proposal.changes.map(async (change) => {
      const blob = await gh.createBlob(owner.login, repoName, change.newContent);
      return {
        path: change.filePath,
        mode: '100644',
        type: 'blob',
        sha: blob.sha
      };
    }));

    const newTree = await gh.createTree(owner.login, repoName, baseSha, treeItems);

    // 4. Create commit
    const newCommit = await gh.createCommit(owner.login, repoName, proposal.commitMessage, newTree.sha, baseSha);

    // 5. Update branch ref
    await gh.updateRef(owner.login, repoName, `heads/${proposal.branchName}`, newCommit.sha);

    // 6. Create Pull Request
    const pr = await gh.createPullRequest(
      owner.login,
      repoName,
      proposal.prTitle,
      proposal.prBody,
      proposal.branchName,
      default_branch
    );

    return { success: true, prUrl: pr.html_url };
  } catch (err: any) {
    console.error("Error applying fix:", err);
    throw new Error(err.message || "Failed to apply fix and create PR.");
  }
}