
"use client";

import { useState, useEffect } from 'react';
import { generateDocumentation } from '@/app/actions/gemini';
import { useRepo } from '@/components/providers/RepoContext';

export default function Documentation() {
  const { currentRepo, githubService, geminiApiKey, setError } = useRepo();
  const [generating, setGenerating] = useState(false);
  const [docContent, setDocContent] = useState<string | null>(null);

  useEffect(() => {
    // Clear docs when repo changes
    setDocContent(null);
  }, [currentRepo]);

  const handleGenerate = async () => {
    if (!currentRepo || !githubService) return;
    if (!geminiApiKey) {
      setError("Please set your Gemini API key in the sidebar.");
      return;
    }
    setGenerating(true);
    try {
      // First try to fetch the README as context
      let context = "No README found.";
      try {
        context = await githubService.fetchReadme(currentRepo.owner.login, currentRepo.name);
      } catch (e) {
        console.warn("Could not fetch README", e);
      }

      const content = await generateDocumentation(currentRepo.name, context, geminiApiKey);
      setDocContent(content || null);
    } catch (error) {
      console.error("Documentation generation failed", error);
      setError("Documentation generation failed. Check your Gemini API key and permissions.");
    } finally {
      setGenerating(false);
    }
  };

  if (!currentRepo) return <div className="p-8 text-github-text">Please select a repository.</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Documentation Studio</h2>
          <p className="text-github-text">Generate technical manuals for <span className="text-github-blue font-semibold">{currentRepo.name}</span>.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-2 bg-github-purple text-white font-bold rounded-md hover:bg-opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            )}
            Generate Wiki
          </button>
        </div>
      </header>

      {!docContent && !generating ? (
        <div className="border-2 border-dashed border-github-border rounded-xl py-24 flex flex-col items-center justify-center text-github-text space-y-4">
          <div className="p-4 bg-github-border/30 rounded-full">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-1">No Documentation for {currentRepo.name}</h3>
            <p className="text-sm">Click "Generate Wiki" to have Gemini index this specific codebase.</p>
          </div>
        </div>
      ) : generating ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-github-purple/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-20 h-20 border-4 border-github-purple border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-white">Synthesizing Knowledge from {currentRepo.name}...</h3>
            <p className="text-github-text animate-pulse">Mapping architecture patterns and logic flows from README.</p>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-700 bg-github-dark border border-github-border rounded-xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-github-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-github-purple rounded-lg flex items-center justify-center text-white font-bold">DOC</div>
              <div>
                <h3 className="text-lg font-bold text-white">System Guide: {currentRepo.name}</h3>
                <span className="text-xs text-github-text">Published via GitMind AI v3.0</span>
              </div>
            </div>
            <button className="text-github-blue hover:underline text-sm font-semibold">
              Copy as Markdown
            </button>
          </div>

          <div className="prose prose-invert prose-blue max-w-none">
            {docContent?.split('\n').map((line, i) => (
              <p key={i} className="mb-4 text-github-text leading-relaxed whitespace-pre-wrap">
                {line}
              </p>
            ))}
          </div>

          <div className="mt-12 pt-6 border-t border-github-border flex items-center justify-between text-xs text-github-text italic">
            <span>Authored by Gemini-3-Pro-Preview</span>
            <span>Last Indexed: Just Now</span>
          </div>
        </div>
      )}
    </div>
  );
}
