// GitHub API Types
export interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
    url: string;
  };
  html_url: string;
  description: string | null;
  private: boolean;
  fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  homepage: string | null;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  language: string | null;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  url: string;
  topics?: string[];
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  user: {
    login: string;
    id: number;
    avatar_url: string;
  };
  assignee?: {
    login: string;
    id: number;
  } | null;
  labels: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  url: string;
  html_url: string;
  aiAnalysis?: string;
  suggestedFix?: string;
  aiProposal?: AIProposal; // New field for AI-generated fix
}

export interface AIProposal {
  commitMessage: string;
  branchName: string;
  prTitle: string;
  prBody: string;
  changes: {
    filePath: string;
    newContent: string;
  }[];
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed' | 'merged';
  user: {
    login: string;
    id: number;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  url: string;
  html_url: string;
  diff_url: string;
  patch_url: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  diffContent?: string;
  aiReview?: AIReview;
  aiProposal?: AIProposal; // New field for AI-generated fix
  files?: { // New field for file contents to give AI more context
    filePath: string;
    content: string;
  }[];
}

export interface AIReview {
  status: 'approve' | 'request_changes' | 'comment';
  feedback: string;
  score: number;
  criticalIssues?: string[];
  shouldProposeFix?: boolean;
  fix?: AIProposal;
}

export interface WorkflowRun {
  id: number;
  name: string;
  node_id: string;
  head_branch: string;
  head_sha: string;
  path: string;
  display_title: string;
  run_number: number;
  event: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | null;
  workflow_id: number;
  check_suite_id: number;
  check_suite_node_id: string;
  url: string;
  html_url: string;
  pull_requests: any[];
  created_at: string;
  updated_at: string;
  actor: {
    login: string;
    id: number;
  };
  run_attempt: number;
  referenced_workflows?: any[];
  head_commit: {
    id: string;
    tree_id: string;
    message: string;
    timestamp: string;
    author: {
      name: string;
      email: string;
    };
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
  };
  head_repository: {
    id: number;
    name: string;
    full_name: string;
  };
  aiAnalysis?: string;
  suggestedFix?: string;
  aiProposal?: AIProposal;
}