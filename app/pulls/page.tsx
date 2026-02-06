
"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { analyzePullRequestAction, getPRAnalyses, applyFixAction, submitPullRequestReviewAction } from '@/app/actions/actions';
import { PullRequest, AIProposal } from '@/types'; // Import AIProposal
import { useRepo } from '@/components/providers/RepoContext';

export default function PullRequests() {
  const { currentRepo, githubService, geminiApiKey, geminiModel, token, setError } = useRepo(); // Added token
  const searchParams = useSearchParams();
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [approving, setApproving] = useState<number | null>(null);
  const [selectedPr, setSelectedPr] = useState<PullRequest | null>(null);

  // State for AI Proposal
  const [isProposingFix, setIsProposingFix] = useState(false); // Loading state for AI analysis for fix
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalDetails, setProposalDetails] = useState<AIProposal | null>(null);
  const [creatingPR, setCreatingPR] = useState(false); // Loading state for creating GitHub PR
  const [prCreationError, setPrCreationError] = useState<string | null>(null);
  const [prCreatedUrl, setPrCreatedUrl] = useState<string | null>(null);


  useEffect(() => {
    const fetch = async () => {
      if (currentRepo && githubService) {
        setLoading(true);
        try {
          const [prData, analysesData] = await Promise.all([
            githubService.fetchPullRequests(currentRepo.owner.login, currentRepo.name),
            getPRAnalyses(currentRepo.owner.login, currentRepo.name)
          ]);

          const mergedPrs = prData.map(pr => {
            const analysis = analysesData.find((a: any) => a.pr_number === pr.number);
            if (analysis) {
              return {
                ...pr,
                aiReview: analysis.analysis,
                aiProposal: analysis.ai_proposal
              };
            }
            return pr;
          });

          setPrs(mergedPrs);

          // Auto-select PR if prNumber is in query params
          const prNumberParam = searchParams.get('prNumber');
          if (prNumberParam) {
            const prNumber = Number(prNumberParam);
            const targetPr = mergedPrs.find(pr => pr.number === prNumber);
            if (targetPr) {
              setSelectedPr(targetPr);
            }
          } else {
            setSelectedPr(null);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      }
      else {
        setPrs([]);
      }
    };
    fetch();
  }, [currentRepo, githubService, searchParams]);

  const handleReview = async (pr: PullRequest) => {
    if (!githubService || !currentRepo) return;
    if (!geminiApiKey) {
      setError("Please set your Gemini API key in the sidebar.");
      return;
    }
    setReviewing(pr.id);
    setIsProposingFix(true); // Indicate that we are waiting for AI analysis including fix proposal

    try {
      const { reviewResult, diffContent, fileContents } = await analyzePullRequestAction(
        currentRepo.owner.login,
        currentRepo.name,
        pr.number
      );

      const updatedPrs = prs.map(p =>
        p.id === pr.id
          ? { ...p, aiReview: reviewResult, aiProposal: reviewResult.fix, diffContent, files: fileContents }
          : p
      );
      setPrs(updatedPrs);

      const matched = updatedPrs.find(p => p.id === pr.id) || null;
      setSelectedPr(matched);

      if (reviewResult.shouldProposeFix && reviewResult.fix) {
        setProposalDetails(reviewResult.fix);
        setShowProposalModal(true);
      } else {
        setProposalDetails(null);
      }

    } catch (error) {
      console.error("AI Review failed", error);
      setError("AI Review failed. Check your Gemini API key and permissions.");
      setProposalDetails(null);
      setShowProposalModal(false);
    } finally {
      setReviewing(null);
      setIsProposingFix(false);
    }
  };

  const handleCreateProposedPR = async () => {
    if (!proposalDetails || !currentRepo || !selectedPr) {
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
      // Optionally, re-fetch PRs to show the new one
    } catch (error: any) {
      console.error("Error creating proposed PR:", error);
      setPrCreationError(error.message || "Failed to create proposed PR.");
    } finally {
      setCreatingPR(false);
    }
  };

  const handleReviewSubmission = async (pr: PullRequest) => {
    if (!currentRepo || !pr.aiReview) return;
    setApproving(pr.id);
    try {
      await submitPullRequestReviewAction(
        currentRepo.owner.login,
        currentRepo.name,
        pr.number,
        pr.aiReview.feedback,
        pr.aiReview.status.toUpperCase() as 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'
      );
      // Refresh PRs to update state
      const prData = await githubService.fetchPullRequests(currentRepo.owner.login, currentRepo.name);
      // Re-merge with existing analyses (simplified for brevity, should ideally refetch analyses too)
      setPrs(prev => prev.map(p => p.id === pr.id ? { ...p, state: 'closed' } : p)); // Optimistic or refetch
      const [newPrData, analysesData] = await Promise.all([
        githubService.fetchPullRequests(currentRepo.owner.login, currentRepo.name),
        getPRAnalyses(currentRepo.owner.login, currentRepo.name)
      ]);
      setPrs(newPrData.map(p => {
        const analysis = analysesData.find((a: any) => a.pr_number === p.number);
        return analysis ? { ...p, aiReview: analysis.analysis, aiProposal: analysis.ai_proposal } : p;
      }));
    } catch (error) {
      console.error("Submission failed", error);
      setError("Review submission failed. Check your permissions.");
    } finally {
      setApproving(null);
    }
  };


  if (!currentRepo) return <div className="p-8 text-github-text">Please select a repository.</div>;

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-github-fg">Pull Requests: <span className="text-github-blue">{currentRepo.name}</span></h2>
          <p className="text-github-text">AI-assisted code reviews and security audits.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-github-blue border-t-transparent rounded-full animate-spin"></div></div>
          ) : prs.length > 0 ? prs.map(pr => (
            <div
              key={pr.id}
              onClick={() => setSelectedPr(pr)}
              className={`p-5 border rounded-lg cursor-pointer transition-all ${selectedPr?.id === pr.id ? 'bg-github-border/30 border-github-blue' : 'bg-github-dark border-github-border hover:border-github-text/50'
                }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-github-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
                  </svg>
                  <h4 className="text-github-fg font-bold truncate max-w-[200px]">{pr.title}</h4>
                </div>
                <span className="text-github-text text-xs">#{pr.number}</span>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono text-xs bg-github-border px-2 py-1 rounded text-github-text truncate max-w-[100px]">{pr.head.ref}</span>
                <span className="text-github-text text-xs">into</span>
                <span className="font-mono text-xs bg-github-border px-2 py-1 rounded text-github-text truncate max-w-[100px]">{pr.base.ref}</span>
              </div>

                                                        <div className="flex items-center justify-between mt-4">

                                                          <div className="flex items-center gap-2">

                                                            <img src={pr.user.avatar_url} className="w-5 h-5 rounded-full" alt="User" />

                                                            <span className="text-xs text-github-text">{pr.user.login}</span>

                                                          </div>

                            

                                                          <div className="flex gap-2">

                                                            <button

                                                              onClick={(e) => { e.stopPropagation(); handleReview(pr); }}

                                                              disabled={reviewing === pr.id}

                                                              className="text-[10px] flex items-center gap-1 px-2 py-1 bg-github-purple/20 text-github-purple border border-github-purple/30 rounded hover:bg-github-purple hover:text-white transition-all disabled:opacity-50"

                                                            >

                                                              {reviewing === pr.id ? (

                                                                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>

                                                              ) : (

                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />

                                                                </svg>

                                                              )}

                                                              {pr.aiReview ? 'Re-Analyze' : 'AI Analysis'}

                                                            </button>

                                                          </div>

                                                        </div>

                            

              
            </div>
          )) : (
            <div className="p-12 text-center bg-github-dark border border-github-border rounded-xl text-github-text opacity-50">
              No active pull requests.
            </div>
          )}
        </div>

        <div className="bg-github-dark border border-github-border rounded-xl flex flex-col min-h-[600px] overflow-hidden">
          {selectedPr ? (
            <div className="flex-1 flex flex-col p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-github-fg">{selectedPr.title}</h3>
                  <a href={selectedPr.html_url} target="_blank" rel="noreferrer" className="text-xs text-github-blue hover:underline">View on GitHub</a>
                </div>
                <p className="text-github-text text-sm mb-4 whitespace-pre-wrap">{selectedPr.body || "No description."}</p>
                {selectedPr.diffContent && (
                  <div className="bg-github-darker p-4 rounded border border-github-border font-mono text-xs text-github-text overflow-x-auto whitespace-pre max-h-60">
                    {selectedPr.diffContent.substring(0, 5000) + (selectedPr.diffContent.length > 5000 ? '...' : '')}
                  </div>
                )}
              </div>

              {selectedPr.aiReview ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
                  <div className="p-5 border border-github-purple/30 bg-github-purple/5 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-github-purple/20 rounded-full flex items-center justify-center border border-github-purple/30">
                          <svg className="w-6 h-6 text-github-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-github-fg font-bold">Gemini Code Review Report</h4>
                          <span className="text-github-text text-xs">Quality Score: <span className="text-github-purple font-bold">{selectedPr.aiReview.score}/100</span></span>
                        </div>
                      </div>
                      <div className={`px-4 py-1.5 rounded-full border text-xs font-bold uppercase ${selectedPr.aiReview.status === 'approve' ? 'bg-github-green/20 text-github-green border-github-green' : 'bg-github-red/20 text-github-red border-github-red'
                        }`}>
                        {selectedPr.aiReview.status === 'approve' ? 'AI Approval' : 'Review Requested'}
                      </div>
                    </div>

                    <div className="prose prose-invert prose-sm max-w-none text-github-text leading-relaxed">
                      {selectedPr.aiReview.feedback}
                    </div>

                    {selectedPr.aiReview.shouldProposeFix && (
                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() => {
                            setProposalDetails(selectedPr.aiProposal || null);
                            setShowProposalModal(true);
                          }}
                          className="flex-1 px-4 py-2 bg-github-blue text-white rounded-md font-semibold hover:bg-opacity-90 flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          Propose AI Fix
                        </button>
                        <button
                          onClick={() => handleReviewSubmission(selectedPr)}
                          disabled={selectedPr.aiReview.status !== 'approve' || approving === selectedPr.id}
                          className={`flex-1 px-4 py-2 text-white rounded-md font-semibold hover:bg-opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 ${selectedPr.aiReview.status === 'approve' ? 'bg-github-green' : 'bg-github-border'}`}
                        >
                          {approving === selectedPr.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          )}
                          Approve on GitHub
                        </button>
                      </div>
                    )}

                    {!selectedPr.aiReview.shouldProposeFix && (
                      <div className="mt-4">
                        <button
                          onClick={() => handleReviewSubmission(selectedPr)}
                          disabled={selectedPr.aiReview.status !== 'approve' || approving === selectedPr.id}
                          className={`w-full px-4 py-2 text-white rounded-md font-semibold hover:bg-opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 ${selectedPr.aiReview.status === 'approve' ? 'bg-github-green' : 'bg-github-border'}`}
                        >
                          {approving === selectedPr.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          )}
                          Approve on GitHub
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (reviewing === selectedPr.id || isProposingFix) ? (
                <div className="flex flex-col items-center justify-center flex-1 space-y-4">
                  <div className="w-12 h-12 border-4 border-github-purple border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-center">
                    <p className="text-github-fg font-bold">Fetching Diff & Analyzing...</p>
                    <p className="text-xs text-github-text mt-1">Checking for security leaks, edge cases, and best practices.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 py-12 text-github-text opacity-40">
                  <svg className="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.167a2.405 2.405 0 00-1.428-1.428l-6.167-2.147a1.76 1.76 0 01.592-3.417h13.358zM11 5.882c0-.387.054-.77.159-1.13a5.132 5.132 0 019.29 0c.105.36.159.743.159 1.13m-9.448 0L20.448 11.882" />
                  </svg>
                  <p className="text-sm">Click "Run AI Review" to start automated verification.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-github-text opacity-40">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-sm">Select a Pull Request to begin AI auditing</p>
            </div>
          )}
        </div>
      </div>

      {showProposalModal && proposalDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-github-dark border border-github-border rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
            <h3 className="text-2xl font-bold text-github-fg mb-4">Proposed AI Fix</h3>
            <p className="text-github-text text-sm mb-6">Gemini has analyzed the pull request and suggests the following changes to create a new pull request:</p>

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
