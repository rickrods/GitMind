
"use client";

import React, { useState, useEffect } from 'react';
import { analyzeIssue } from '@/app/actions/gemini';
import { saveIssueAnalysis, getIssueAnalyses, applyFixAction } from '@/app/actions/actions';
import { GitHubIssue, AIProposal } from '@/types';
import { useRepo } from '@/components/providers/RepoContext';

export default function Issues() {
  const { currentRepo, githubService, geminiApiKey, geminiModel, token, setError } = useRepo();
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState<number | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<GitHubIssue | null>(null);

  // State for AI Proposal
  const [isProposingFix, setIsProposingFix] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalDetails, setProposalDetails] = useState<AIProposal | null>(null);
  const [creatingPR, setCreatingPR] = useState(false);
  const [prCreationError, setPrCreationError] = useState<string | null>(null);
  const [prCreatedUrl, setPrCreatedUrl] = useState<string | null>(null);

  // State for Feedback
  const [feedbackInput, setFeedbackInput] = useState("");

  useEffect(() => {
    const fetch = async () => {
      if (currentRepo && githubService) {
        setLoading(true);
        try {
          const [issuesData, analysesData] = await Promise.all([
            githubService.fetchIssues(currentRepo.owner.login, currentRepo.name),
            getIssueAnalyses(currentRepo.owner.login, currentRepo.name)
          ]);

          const mergedIssues = issuesData.map(issue => {
            const analysis = analysesData.find((a: any) => a.issue_number === issue.number);
            if (analysis) {
              return {
                ...issue,
                aiAnalysis: analysis.analysis,
                suggestedFix: analysis.suggested_fix,
                needsInfo: analysis.needs_info,
                aiProposal: analysis.ai_proposal // Restore the proposal
              };
            }
            return issue;
          });

          setIssues(mergedIssues);
          setSelectedIssue(null);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      } else {
        setIssues([]);
      }
    };
    fetch();
  }, [currentRepo, githubService]);

  const handleAnalyze = async (issue: GitHubIssue, feedback?: string) => {
    if (!geminiApiKey || !currentRepo || !githubService) {
      setError("Please ensure Gemini API key is set and a repository is selected.");
      return;
    }
    setAnalyzing(issue.id);
    setIsProposingFix(true);
    try {
      // Fetch repository structure for context
      const structure = await githubService.getRepoStructure(currentRepo.owner.login, currentRepo.name, currentRepo.default_branch);
      const structureString = structure.map(item => `${item.type === 'tree' ? '[DIR]' : '[FILE]'} ${item.path}`).join('\n');

      const result = await analyzeIssue(issue, currentRepo, structureString, geminiApiKey, feedback, geminiModel || 'gemini-3-flash-preview');

      await saveIssueAnalysis(
        currentRepo.owner.login,
        currentRepo.name,
        issue.number,
        result.analysis,
        result.suggestedFix,
        false, // needs_info default false for now
        result.fix // Save the proposal
      );

      const updatedIssues = issues.map(i =>
        i.id === issue.id
          ? {
            ...i,
            aiAnalysis: result.analysis,
            suggestedFix: result.suggestedFix,
            aiProposal: result.fix
          }
          : i
      );
      setIssues(updatedIssues);
      const matched = updatedIssues.find(i => i.id === issue.id);
      if (matched) setSelectedIssue(matched);

      if (result.shouldProposeFix && result.fix) {
        setProposalDetails(result.fix);
      } else {
        setProposalDetails(null);
      }

      if (feedback) setFeedbackInput(""); // Clear feedback after successful refinement

    } catch (error) {
      console.error("AI Analysis failed", error);
      setError("AI Analysis failed. Check your Gemini API key and permissions.");
      setProposalDetails(null);
    } finally {
      setAnalyzing(null);
      setIsProposingFix(false);
    }
  };

  const handleCreateProposedPR = async () => {
    if (!proposalDetails || !currentRepo || !selectedIssue) {
      setError("Cannot create PR: missing details.");
      return;
    }

    setCreatingPR(true);
    setPrCreationError(null);
    setPrCreatedUrl(null);

    try {
      const result = await applyFixAction(currentRepo, proposalDetails);

      if (!result.success) {
        throw new Error("Failed to create proposed PR");
      }

      setPrCreatedUrl(result.prUrl);
      setShowProposalModal(false); // Close modal on success
    } catch (error: any) {
      console.error("Error creating proposed PR:", error);
      setPrCreationError(error.message || "Failed to create proposed PR.");
    } finally {
      setCreatingPR(false);
    }
  };

  if (!currentRepo) return <div className="p-8 text-github-text">Please select a repository.</div>;

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-github-fg">Issue Manager: <span className="text-github-blue">{currentRepo.name}</span></h2>
          <p className="text-github-text">Auto-resolve bugs and triage tasks with Gemini 3 Reasoning.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="space-y-4 lg:col-span-1">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-github-blue border-t-transparent rounded-full animate-spin"></div></div>
          ) : issues.length > 0 ? issues.map((issue) => (
            <div
              key={issue.id}
              onClick={() => setSelectedIssue(issue)}
              className={`p-4 border rounded-lg transition-all cursor-pointer ${selectedIssue?.id === issue.id ? 'bg-github-border/30 border-github-blue' : 'bg-github-dark border-github-border hover:border-github-text/50'
                }`}
            >
              <div className="flex items-start gap-3">
                <svg className={`w-5 h-5 mt-0.5 ${issue.state === 'open' ? 'text-green-500' : 'text-purple-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-github-fg font-bold hover:text-github-blue text-sm line-clamp-1">{issue.title}</h4>
                    <span className="text-github-text text-xs">#{issue.number}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {issue.labels.map(l => (
                      <span key={l.id} className="text-[10px] px-2 py-0.5 rounded-full border border-github-border text-github-text uppercase font-semibold" style={{ borderColor: `#${l.color}` }}>
                        {l.name}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-github-text">Opened by {issue.user.login}</span>
                    <div className="flex gap-2">
                      {issue.aiProposal && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIssue(issue);
                            setProposalDetails(issue.aiProposal || null);
                            setShowProposalModal(true);
                          }}
                          className="text-[10px] flex items-center gap-1 inline-flex px-2 py-1 bg-github-green/20 text-github-green border border-github-green/30 rounded hover:bg-github-green hover:text-white transition-all"
                          title="Apply the cached AI fix"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Apply
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnalyze(issue);
                        }}
                        disabled={analyzing === issue.id}
                        className="text-[10px] flex items-center gap-1 inline-flex px-2 py-1 bg-github-purple/20 text-github-purple border border-github-purple/30 rounded hover:bg-github-purple hover:text-white transition-all disabled:opacity-50"
                      >
                        {analyzing === issue.id ? (
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                        {issue.aiAnalysis ? 'Re-Analyze' : 'AI Analysis'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="p-12 text-center bg-github-dark border border-github-border rounded-xl text-github-text opacity-50">
              No open issues found in this repository.
            </div>
          )}
        </div>

        <div className="bg-github-dark border border-github-border rounded-xl p-6 min-h-[500px] lg:col-span-3">
          {selectedIssue ? (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-github-fg">{selectedIssue.title}</h3>
                  <a href={selectedIssue.html_url} target="_blank" rel="noreferrer" className="text-xs text-github-blue hover:underline">View on GitHub</a>
                </div>
                <div className="p-4 bg-github-darker border border-github-border rounded-lg text-sm text-github-text font-mono leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                  {selectedIssue.body || "No description provided."}
                </div>
              </div>

              {selectedIssue.aiAnalysis && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-github-purple">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.673.337a4 4 0 01-2.509.548l-2.299-.287a2 2 0 01-1.556-1.148l-1.11-2.339a2 2 0 01.321-2.003l1.27-1.587a2 2 0 012.315-.615l1.503.601a4 4 0 003.58 0l1.503-.601a2 2 0 012.315.615l1.27 1.587a2 2 0 01.321 2.003l-1.11 2.339zm0 0l-1.11 2.339a2 2 0 01-1.556 1.148l-2.299.287a4 4 0 01-2.509-.548l-.673-.337a6 6 0 00-3.86-.517l-2.387.477a2 2 0 00-1.022.547" />
                    </svg>
                    <span className="font-bold uppercase text-xs tracking-widest">Gemini Triage Result</span>
                    {selectedIssue.aiProposal && (
                      <span className="ml-auto text-[10px] bg-github-green/10 text-github-green border border-github-green/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Available in DB
                      </span>
                    )}
                  </div>
                  <div className="p-4 bg-github-purple/5 border border-github-purple/20 rounded-lg">
                    <p className="text-github-text text-sm leading-relaxed italic mb-4">
                      "{selectedIssue.aiAnalysis}"
                    </p>
                    <h5 className="text-github-fg font-semibold text-xs mb-2 uppercase tracking-wide">Suggested Implementation</h5>
                    <div className="bg-github-darker p-3 rounded border border-github-border text-xs text-github-text font-mono whitespace-pre-wrap overflow-x-auto mb-4">
                      {selectedIssue.suggestedFix}
                    </div>

                    <div className="space-y-3 mb-4">
                      <textarea
                        value={feedbackInput}
                        onChange={(e) => setFeedbackInput(e.target.value)}
                        placeholder="Suggest changes to the AI proposal (e.g., 'Use a different library', 'Follow specific naming conventions')..."
                        className="w-full bg-github-darker border border-github-border rounded-lg p-3 text-xs text-github-text focus:border-github-purple focus:outline-none min-h-[80px] transition-all"
                      />
                      <button
                        onClick={() => handleAnalyze(selectedIssue, feedbackInput)}
                        disabled={analyzing === selectedIssue.id || !feedbackInput.trim()}
                        className="w-full py-2 bg-github-purple/20 text-github-purple border border-github-purple/30 rounded-md text-xs font-bold hover:bg-github-purple hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {analyzing === selectedIssue.id ? (
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        )}
                        Refine with Feedback
                      </button>

                      {selectedIssue.aiProposal && (
                        <button
                          onClick={() => {
                            setProposalDetails(selectedIssue.aiProposal || null);
                            setShowProposalModal(true);
                          }}
                          className="w-full px-4 py-2 bg-github-blue text-white rounded-md font-semibold hover:bg-opacity-90 flex items-center justify-center gap-2 mt-4"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          Propose AI Fix
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!selectedIssue.aiAnalysis && !analyzing && (
                <div className="flex flex-col items-center justify-center h-64 text-github-text space-y-3">
                  <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p className="text-sm">Click "AI Analysis" to get deep reasoning from Gemini 3.</p>
                </div>
              )}

              {analyzing === selectedIssue.id && (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                  <div className="w-10 h-10 border-4 border-github-purple border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-github-text font-medium animate-pulse">Consulting the model about this bug...</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-github-text opacity-50">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p>Select an issue to view details and AI suggestions</p>
            </div>
          )}
        </div>
      </div>

      {showProposalModal && proposalDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-github-dark border border-github-border rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
            <h3 className="text-2xl font-bold text-github-fg mb-4">Proposed AI Fix</h3>
            <p className="text-github-text text-sm mb-6">Gemini has analyzed the issue and suggests the following changes to create a new pull request:</p>

            <div className="space-y-4 mb-6">
              <div>
                <h4 className="text-lg font-semibold text-github-fg">New PR Title:</h4>
                <p className="text-github-blue font-mono text-sm">{proposalDetails.prTitle}</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-github-fg">New PR Body:</h4>
                <div className="bg-github-darker p-3 rounded border border-github-border text-xs text-github-text font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {proposalDetails.prBody}
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-github-fg">Commit Message:</h4>
                <p className="text-github-blue font-mono text-sm">{proposalDetails.commitMessage}</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-github-fg">New Branch Name:</h4>
                <p className="text-github-blue font-mono text-sm">{proposalDetails.branchName}</p>
              </div>
            </div>

            <h4 className="text-lg font-semibold text-github-fg mb-3">Proposed File Changes:</h4>
            <div className="space-y-4 mb-6 max-h-60 overflow-y-auto border border-github-border p-3 rounded">
              {proposalDetails.changes.length > 0 ? proposalDetails.changes.map((change, index) => (
                <div key={index} className="bg-github-darker p-3 rounded border border-github-border">
                  <p className="text-github-blue font-mono text-xs mb-2">{change.filePath}</p>
                  <div className="font-mono text-xs text-github-text whitespace-pre-wrap overflow-x-auto max-h-40">
                    {change.newContent}
                  </div>
                </div>
              )) : <p className="text-github-text text-sm">No specific file changes proposed.</p>}
            </div>

            {prCreationError && (
              <div className="p-3 bg-red-900/50 border border-red-500 rounded text-sm text-red-200 mb-4">
                Error creating PR: {prCreationError}
              </div>
            )}

            {prCreatedUrl && (
              <div className="p-3 bg-green-900/50 border border-green-500 rounded text-sm text-green-200 mb-4">
                Pull Request created successfully! <a href={prCreatedUrl} target="_blank" rel="noopener noreferrer" className="underline text-green-300">View PR</a>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowProposalModal(false);
                  setPrCreatedUrl(null);
                  setPrCreationError(null);
                }}
                className="px-4 py-2 border border-github-border text-github-text rounded-md hover:bg-github-border"
                disabled={creatingPR}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProposedPR}
                className="px-4 py-2 bg-github-green text-white rounded-md font-semibold hover:bg-opacity-90 flex items-center gap-2"
                disabled={creatingPR || !!prCreatedUrl}
              >
                {creatingPR ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )}
                {creatingPR ? "Creating PR..." : "Create Pull Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

