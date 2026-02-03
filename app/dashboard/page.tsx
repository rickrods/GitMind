
import React, { useEffect, useState } from 'react';
import { useRepo } from '@/components/providers/RepoContext';
import { WorkflowRun } from '@/types';

const Dashboard: React.FC = () => {
  const { currentRepo, setCurrentRepo, repositories, githubService } = useRepo();
  const [workflows, setWorkflows] = useState<WorkflowRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);

  useEffect(() => {
    const fetchRuns = async () => {
      if (currentRepo && githubService) {
        setLoadingRuns(true);
        try {
          const runs = await githubService.fetchWorkflows(currentRepo.owner.login, currentRepo.name);
          setWorkflows(runs);
        } catch (e) {
          console.error("Failed to load workflows", e);
        } finally {
          setLoadingRuns(false);
        }
      }
    };
    fetchRuns();
  }, [currentRepo, githubService]);

  if (!currentRepo) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6 animate-in fade-in">
        <div className="w-20 h-20 bg-github-dark border border-github-border rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-github-text" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Welcome to GitMind</h2>
          <p className="text-github-text max-w-md mx-auto mt-2">To get started, please login then set your GitHub Personal Access Token and Gemini API Key in the settings and add a repository via URL.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Project Overview</h2>
          <p className="text-github-text">Manage your active codebases with Gemini 3 intelligence.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Repositories List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-semibold text-github-text uppercase tracking-wider">Repositories</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {repositories.map((repo) => (
              <div
                key={repo.id}
                onClick={() => void setCurrentRepo(repo)}
                className={`p-5 rounded-lg border cursor-pointer transition-all ${currentRepo?.id === repo.id
                  ? 'bg-github-border/20 border-github-blue ring-1 ring-github-blue/50 shadow-lg shadow-github-blue/5'
                  : 'bg-github-dark border-github-border hover:border-github-text/50'
                  }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <img src={repo.owner.avatar_url} alt={repo.owner.login} className="w-5 h-5 rounded-full" />
                    <span className={`font-bold text-lg hover:underline truncate ${currentRepo.id === repo.id ? 'text-github-blue' : 'text-github-text'}`}>{repo.name}</span>
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

        {/* Recent CI Pipeline for current repo */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-github-text uppercase tracking-wider">Active Pipelines: {currentRepo.name}</h3>
          <div className="bg-github-dark border border-github-border rounded-lg overflow-hidden min-h-[200px]">
            {loadingRuns ? (
              <div className="flex justify-center items-center h-48">
                <div className="w-6 h-6 border-2 border-github-blue border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : workflows.length > 0 ? workflows.slice(0, 5).map((run) => (
              <div key={run.id} className="p-4 border-b border-github-border last:border-0 hover:bg-white/5 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white truncate max-w-[150px]">{run.name}</span>
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
              </div>
            )) : (
              <div className="p-8 text-center text-xs text-github-text opacity-50">No recent pipelines found.</div>
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
            <h4 className="text-lg font-bold text-white italic">"Gemini Insight"</h4>
            <p className="text-sm text-github-text">
              Codebase <span className="text-github-purple font-semibold">{currentRepo.name}</span> is currently active.
              <br />AI Suggestion: Gemini is monitoring {workflows.length} recent workflow runs for anomalies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
