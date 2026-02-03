
"use client";

import { useEffect, useState } from 'react';
import { WorkflowRun, AIProposal } from '../../types';
import { useRepo } from '@/components/providers/RepoContext';
import { analyzeWorkflowAction, applyFixAction } from '@/app/actions/actions';
import { toast } from 'react-hot-toast';

export default function CIConfig() {
  const { currentRepo, githubService } = useRepo();
  const [workflows, setWorkflows] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(false);

  // Analysis state
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    runId: number;
    analysis: string;
    suggestedFix: string;
    shouldProposeFix: boolean;
    fix?: AIProposal;
  } | null>(null);
  const [applyingFix, setApplyingFix] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (currentRepo && githubService) {
        setLoading(true);
        try {
          const data = await githubService.fetchWorkflows(currentRepo.owner.login, currentRepo.name);
          setWorkflows(data);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      } else {
        setWorkflows([]);
      }
    };
    fetch();
  }, [currentRepo, githubService]);

  const handleAnalyze = async (run: WorkflowRun) => {
    if (!currentRepo) return;
    setAnalyzingId(run.id);
    setAnalysisResult(null);
    try {
      const result = await analyzeWorkflowAction(currentRepo.owner.login, currentRepo.name, run.id);
      setAnalysisResult({ runId: run.id, ...result });
    } catch (err: any) {
      toast.error(err.message || "Analysis failed");
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleApplyFix = async () => {
    if (!analysisResult?.fix || !currentRepo) return;
    setApplyingFix(true);
    try {
      const result = await applyFixAction(currentRepo, analysisResult.fix);
      toast.success("Fix applied! PR created.");
      window.open(result.prUrl, '_blank');
      setAnalysisResult(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to apply fix");
    } finally {
      setApplyingFix(false);
    }
  };

  if (!currentRepo) return <div className="p-8 text-github-text">Please select a repository.</div>;

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">CI/CD: <span className="text-github-blue">{currentRepo.name}</span></h2>
          <p className="text-github-text">Monitor workflows and configure AI-driven deployment gates.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-github-dark border border-github-border p-5 rounded-xl">
          <p className="text-github-text text-xs uppercase font-bold tracking-widest mb-1">Total Runs</p>
          <p className="text-3xl font-bold text-white">{workflows.length}</p>
        </div>
        <div className="bg-github-dark border border-github-border p-5 rounded-xl">
          <p className="text-github-text text-xs uppercase font-bold tracking-widest mb-1">Recent Success</p>
          <p className="text-3xl font-bold text-white">
            {workflows.filter(w => w.conclusion === 'success').length}
          </p>
        </div>
        <div className="bg-github-dark border border-github-border p-5 rounded-xl">
          <p className="text-github-text text-xs uppercase font-bold tracking-widest mb-1">Failures</p>
          <p className="text-3xl font-bold text-white">
            {workflows.filter(w => w.conclusion === 'failure').length}
          </p>
        </div>
        <div className="bg-github-dark border border-github-border p-5 rounded-xl">
          <p className="text-github-text text-xs uppercase font-bold tracking-widest mb-1">Avg Duration</p>
          <p className="text-3xl font-bold text-white">--</p>
          <p className="mt-2 text-xs text-github-text italic">Needs historic data</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-github-dark border border-github-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-github-border bg-github-darker">
              <h3 className="text-white font-bold">Recent Workflow Executions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-github-text border-b border-github-border font-medium">
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Workflow</th>
                    <th className="px-6 py-4">Event</th>
                    <th className="px-6 py-4">Branch</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="py-8 text-center"><div className="inline-block w-6 h-6 border-2 border-github-blue border-t-transparent rounded-full animate-spin"></div></td></tr>
                  ) : workflows.length > 0 ? workflows.map((run) => (
                    <tr key={run.id} className={`border-b border-github-border hover:bg-white/5 transition-colors group ${analysisResult?.runId === run.id ? 'bg-github-blue/5' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${run.conclusion === 'success' ? 'bg-github-green' :
                            run.conclusion === 'failure' ? 'bg-github-red' :
                              'bg-github-blue animate-pulse'
                            }`}></div>
                          <span className={`font-medium ${run.conclusion === 'success' ? 'text-github-green' :
                            run.conclusion === 'failure' ? 'text-github-red' :
                              'text-github-blue'
                            }`}>
                            {run.conclusion || run.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-white">
                        <div className="flex flex-col">
                          <span className="truncate max-w-[200px]">{run.name}</span>
                          <span className="text-[10px] text-github-text font-normal mt-0.5">{new Date(run.created_at).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-github-text bg-github-border/50 px-2 py-0.5 rounded border border-github-border text-[10px]">
                          {run.event}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-github-blue bg-github-blue/10 px-2 py-0.5 rounded font-mono text-[10px] truncate max-w-[100px] inline-block">
                          {run.head_branch}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {run.conclusion === 'failure' && (
                            <button
                              onClick={() => handleAnalyze(run)}
                              disabled={analyzingId !== null}
                              className="p-1.5 bg-github-purple/10 text-github-purple hover:bg-github-purple hover:text-white rounded-md transition-all border border-github-purple/20 disabled:opacity-50"
                              title="Analyze with Gemini"
                            >
                              {analyzingId === run.id ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              )}
                            </button>
                          )}
                          <a href={run.html_url} target="_blank" rel="noreferrer" className="p-1.5 text-github-text hover:text-white transition-colors" title="View on GitHub">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-github-text opacity-50">No workflows found for this repository.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-github-dark border border-github-border rounded-xl p-6 min-h-[400px]">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-github-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI Error Analysis
            </h3>

            {!analysisResult && !analyzingId && (
              <div className="flex flex-col items-center justify-center h-64 text-center opacity-40">
                <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">Select a failed run to analyze logs with Gemini.</p>
              </div>
            )}

            {analyzingId && (
              <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="w-10 h-10 border-4 border-github-purple border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-github-text animate-pulse">Scanning logs for root cause...</p>
              </div>
            )}

            {analysisResult && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="p-4 bg-github-purple/5 border border-github-purple/20 rounded-lg">
                  <h4 className="text-xs font-bold text-github-purple uppercase tracking-widest mb-2">Analysis</h4>
                  <p className="text-sm text-github-text leading-relaxed">
                    {analysisResult.analysis}
                  </p>
                </div>

                <div className="p-4 bg-github-darker border border-github-border rounded-lg">
                  <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-2">Suggested Fix</h4>
                  <div className="prose prose-invert prose-xs max-w-none text-github-text font-mono text-[11px] whitespace-pre-wrap">
                    {analysisResult.suggestedFix}
                  </div>
                </div>

                {analysisResult.shouldProposeFix && analysisResult.fix && (
                  <button
                    onClick={handleApplyFix}
                    disabled={applyingFix}
                    className="w-full py-3 bg-github-green text-white rounded-lg font-bold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    {applyingFix ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    )}
                    {applyingFix ? "Creating PR..." : "Apply Auto-Fix PR"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
