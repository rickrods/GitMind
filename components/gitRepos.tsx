'use client';

import React, { useEffect, useState } from 'react';
import { useRepo } from '@/components/providers/RepoContext';
import { WorkflowRun, GitHubIssue, PullRequest, Repository } from '@/types';
import { User } from '@supabase/supabase-js';
import { createSupabaseClient } from '@/lib/supabase/client';
import { GitHubService } from '@/utils/github';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface GitReposProps {
    initialUser: User | null;
    initialRepo: Repository | null;
    initialRepositories: Repository[];
    initialToken: string | null;
}

export default function GitRepos({ initialUser, initialRepo, initialRepositories = [], initialToken }: GitReposProps) {
    const { currentRepo: contextRepo, setCurrentRepo, repositories: contextRepos, githubService: contextGithubService, user: contextUser, removeRepository, loading } = useRepo();
    const [workflows, setWorkflows] = useState<WorkflowRun[]>([]);
    const [issues, setIssues] = useState<GitHubIssue[]>([]);
    const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
    const [loadingRuns, setLoadingRuns] = useState(false);
    const [loadingIssues, setLoadingIssues] = useState(false);
    const [loadingPRs, setLoadingPRs] = useState(false);
    const supabase = createSupabaseClient();

    // Use context data if available, otherwise fallback to server-fetched initial data
    const user = contextUser || initialUser;
    const currentRepo = contextRepo || initialRepo;
    // Fix: Only use initialRepositories if context is still loading. 
    // Otherwise, if context is loaded but empty (user deleted all repos), we should show empty list, not initial.
    const repositories = loading ? initialRepositories : contextRepos;

    const githubService = React.useMemo(() => {
        if (contextGithubService) return contextGithubService;
        if (initialToken) return new GitHubService(initialToken);
        return null;
    }, [contextGithubService, initialToken]);

    const handleRemoveRepo = async (e: React.MouseEvent, repoId: number, repoName: string) => {
        e.stopPropagation(); // Prevent clicking the card
        if (window.confirm(`Are you sure you want to remove ${repoName} from your list?`)) {
            try {
                await removeRepository(repoId);
                toast.success(`Removed ${repoName}`);
            } catch (err) {
                toast.error("Failed to remove repository");
                console.error(err);
            }
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (currentRepo && githubService) {
                // Fetch workflows
                setLoadingRuns(true);
                try {
                    const runs = await githubService.fetchWorkflows(currentRepo.owner.login, currentRepo.name);
                    setWorkflows(runs);
                } catch (e) {
                    console.error("Failed to load workflows", e);
                } finally {
                    setLoadingRuns(false);
                }

                // Fetch issues
                setLoadingIssues(true);
                try {
                    const issuesData = await githubService.fetchIssues(currentRepo.owner.login, currentRepo.name);
                    setIssues(issuesData);
                } catch (e) {
                    console.error("Failed to load issues", e);
                } finally {
                    setLoadingIssues(false);
                }

                // Fetch pull requests
                setLoadingPRs(true);
                try {
                    const prsData = await githubService.fetchPullRequests(currentRepo.owner.login, currentRepo.name);
                    setPullRequests(prsData);
                } catch (e) {
                    console.error("Failed to load pull requests", e);
                } finally {
                    setLoadingPRs(false);
                }
            }
        };
        fetchData();
    }, [currentRepo, githubService]);

    // Only show welcome screen if user is NOT logged in
    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6 animate-in fade-in">
                <div className="w-20 h-20 bg-github-dark border border-github-border rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-github-text" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-github-fg">Welcome to GitMind</h2>
                    <p className="text-github-text max-w-md mx-auto mt-2">To get started, please login then set your GitHub Personal Access Token and Gemini API Key in the settings and add a repository via URL.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-github-fg">Project Overview</h2>
                    <p className="text-github-text">Manage your active codebases with Gemini 3 intelligence.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Repositories List */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-semibold text-github-text uppercase tracking-wider">Repositories</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {repositories.map((repo) => (
                            <div
                                key={repo.id}
                                onClick={() => void setCurrentRepo(repo)}
                                className={`group relative p-5 rounded-lg border cursor-pointer transition-all ${currentRepo?.id === repo.id
                                    ? 'bg-github-border/20 border-github-blue ring-1 ring-github-blue/50 shadow-lg shadow-github-blue/5'
                                    : 'bg-github-dark border-github-border hover:border-github-text/50'
                                    }`}
                            >
                                <div className="absolute top-4 right-4 z-50">
                                    <button
                                        onClick={(e) => handleRemoveRepo(e, repo.id, repo.name)}
                                        className="p-1.5 text-github-text opacity-50 hover:opacity-100 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                                        title="Remove Repository"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="flex items-start justify-between mb-2 pr-8">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <img src={repo.owner.avatar_url} alt={repo.owner.login} className="w-5 h-5 rounded-full" />
                                        <span className={`font-bold text-lg hover:underline truncate ${currentRepo?.id === repo.id ? 'text-github-blue' : 'text-github-text'}`}>{repo.name}</span>
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-github-border text-github-text uppercase shrink-0">
                                        {repo.language || 'N/A'}
                                    </span>
                                </div>
                                <p className="text-sm text-github-text line-clamp-2 mb-4 h-10">{repo.description || "No description provided."}</p>
                                <div className="flex items-center gap-4 text-xs text-github-text">
                                    <span className="flex items-center gap-1">
                                        <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                                        {repo.stargazers_count}
                                    </span>
                                    <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Only show details if a repo is selected */}
            {currentRepo ? (
                <>
                    {/* Stats Grid - CI, Issues, PRs */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Recent CI Pipelines */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-github-text uppercase tracking-wider"><a href="/ci">Active Pipelines</a></h3>
                            <div className="bg-github-dark border border-github-border rounded-lg overflow-hidden min-h-[200px]">
                                {loadingRuns ? (
                                    <div className="flex justify-center items-center h-48">
                                        <div className="w-6 h-6 border-2 border-github-blue border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : workflows.length > 0 ? workflows.slice(0, 5).map((run) => (
                                    <a key={run.id} href={`/ci?runId=${run.id}`} className="block p-4 border-b border-github-border last:border-0 hover:bg-white/5 transition-colors cursor-pointer">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-github-fg truncate max-w-[150px]">{run.name}</span>
                                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${run.conclusion === 'success' ? 'bg-github-green/20 text-github-green border border-github-green/40' :
                                                run.conclusion === 'failure' ? 'bg-github-red/20 text-github-red border border-github-red/40' :
                                                    'bg-github-blue/20 text-github-blue animate-pulse'
                                                }`}>
                                                {run.conclusion || run.status}
                                            </div>
                                        </div>
                                        <div className="text-xs text-github-text flex items-center gap-2">
                                            <span className="font-mono">{run.head_branch}</span>
                                            <span>•</span>
                                            <span>{new Date(run.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </a>
                                )) : (
                                    <div className="p-8 text-center text-xs text-github-text opacity-50">No recent pipelines found.</div>
                                )}
                            </div>
                        </div>

                        {/* Recent Issues */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-github-text uppercase tracking-wider"><a href="/issues">Recent Issues </a></h3>
                            <div className="bg-github-dark border border-github-border rounded-lg overflow-hidden min-h-[200px]">
                                {loadingIssues ? (
                                    <div className="flex justify-center items-center h-48">
                                        <div className="w-6 h-6 border-2 border-github-purple border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : issues.length > 0 ? issues.slice(0, 5).map((issue) => (
                                    <a key={issue.id} href={`/issues?issueNumber=${issue.number}`} className="block p-4 border-b border-github-border last:border-0 hover:bg-white/5 transition-colors cursor-pointer">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-github-fg truncate max-w-[150px]">#{issue.number}</span>
                                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${issue.state === 'open' ? 'bg-github-green/20 text-github-green border border-github-green/40' :
                                                'bg-github-purple/20 text-github-purple border border-github-purple/40'
                                                }`}>
                                                {issue.state}
                                            </div>
                                        </div>
                                        <p className="text-xs text-github-text line-clamp-2 mb-1">{issue.title}</p>
                                        <div className="text-xs text-github-text opacity-70">
                                            {new Date(issue.created_at).toLocaleDateString()}
                                        </div>
                                    </a>
                                )) : (
                                    <div className="p-8 text-center text-xs text-github-text opacity-50">No issues found.</div>
                                )}
                            </div>
                        </div>

                        {/* Recent Pull Requests */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-github-text uppercase tracking-wider"><a href="/pulls">Recent Pull Requests</a></h3>
                            <div className="bg-github-dark border border-github-border rounded-lg overflow-hidden min-h-[200px]">
                                {loadingPRs ? (
                                    <div className="flex justify-center items-center h-48">
                                        <div className="w-6 h-6 border-2 border-github-green border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : pullRequests.length > 0 ? pullRequests.slice(0, 5).map((pr) => (
                                    <a key={pr.id} href={`/pulls?prNumber=${pr.number}`} className="block p-4 border-b border-github-border last:border-0 hover:bg-white/5 transition-colors cursor-pointer">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-github-fg truncate max-w-[150px]">#{pr.number}</span>
                                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${pr.state === 'open' ? 'bg-github-green/20 text-github-green border border-github-green/40' :
                                                pr.merged_at ? 'bg-github-purple/20 text-github-purple border border-github-purple/40' :
                                                    'bg-github-red/20 text-github-red border border-github-red/40'
                                                }`}>
                                                {pr.merged_at ? 'merged' : pr.state}
                                            </div>
                                        </div>
                                        <p className="text-xs text-github-text line-clamp-2 mb-1">{pr.title}</p>
                                        <div className="text-xs text-github-text opacity-70">
                                            {new Date(pr.created_at).toLocaleDateString()}
                                        </div>
                                    </a>
                                )) : (
                                    <div className="p-8 text-center text-xs text-github-text opacity-50">No pull requests found.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-github-purple/20 to-github-blue/20 p-6 rounded-xl border border-github-purple/30">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-github-purple rounded-lg">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-github-fg italic">"Gemini Insight"</h4>
                                <p className="text-sm text-github-text">
                                    Codebase <span className="text-github-purple font-semibold">{currentRepo.name}</span> is currently active.
                                    <br />AI Suggestion: Gemini is monitoring {workflows.length} recent workflow runs for anomalies.
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="p-8 text-center border border-dashed border-github-border rounded-lg text-github-text">
                    <p>Select a repository from the list above to view details.</p>
                </div>
            )}
        </div>
    );
}