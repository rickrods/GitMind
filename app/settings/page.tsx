"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { CreditCard, Shield, Key, Zap, X } from "lucide-react";
import { useRepo } from "@/components/providers/RepoContext";
import { siGithub } from 'simple-icons';
import BrandIcon from '@/components/BrandIcon';
import CustomSelect from '@/components/geminiModelSelectorBox';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  const { token, setToken, addRepository, error, clearError, loading, geminiApiKey, setGeminiApiKey, geminiModel, setGeminiModel, getGeminiModel, currentRepo } = useRepo();

  const [newToken, setNewToken] = useState("");
  const [newRepoUrl, setNewRepoUrl] = useState("");
  const [newGeminiApiKey, setNewGeminiApiKey] = useState("");
  // State for the selected model in the dropdown
  const [model, setModel] = useState("");
  const [isAddingRepo, setIsAddingRepo] = useState(false);
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [isSavingGeminiKey, setIsSavingGeminiKey] = useState(false);


  // Effect to update local model state from DB
  useEffect(() => {
    const fetchModel = async () => {
      const m = await getGeminiModel();
      if (m) setModel(m);
    };
    fetchModel();
  }, [getGeminiModel]);

  // Effect to populate repo url
  useEffect(() => {
    if (currentRepo?.html_url) {
      setNewRepoUrl(currentRepo.html_url);
    }
  }, [currentRepo]);

  const handleSaveToken = async () => {
    if (newToken.trim()) {
      setIsSavingToken(true);
      try {
        await setToken(newToken.trim());
        setNewToken("");
      } finally {
        setIsSavingToken(false);
      }
    }
  };

  const handleSaveGeminiApiKey = async () => {
    if (newGeminiApiKey.trim()) {
      setIsSavingGeminiKey(true);
      try {
        await setGeminiApiKey(newGeminiApiKey.trim());
        setNewGeminiApiKey("");
      } finally {
        setIsSavingGeminiKey(false);
      }
    }
  };

  const handleAddRepo = async () => {
    if (newRepoUrl.trim()) {
      setIsAddingRepo(true);
      try {
        await addRepository(newRepoUrl.trim());
        setNewRepoUrl("");
      } finally {
        setIsAddingRepo(false);
      }
    }
  };

  // Saves the locally selected model to the context
  const handleSaveGeminiModel = async () => {
    if (model.trim()) {
      setIsSavingGeminiKey(true); // Re-using this state for saving model as well
      try {
        await setGeminiModel(model.trim());
        // Optionally clear model state after saving, or keep it to show saved value
        // setModel(""); 
      } finally {
        setIsSavingGeminiKey(false);
      }
    }
  };

  const modelOptions = [
    { label: "Gemini 3 Pro", value: "gemini-3-pro-preview" },
    { label: "Gemini 3 Flash Preview", value: "gemini-3-flash-preview" },
    { label: "Gemini 2.5 Pro", value: "gemini-2.5-pro" },
    { label: "Gemini 2.5 Flash", value: "gemini-2.5-flash" },
    { label: "Gemini 2.5 Flash Lite", value: "gemini-2.5-flash-lite" },
  ];

  return (
    <>
      <div className="space-y-8 max-w-4xl mx-auto pb-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-200 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={clearError} className="hover:opacity-70">
              <X size={18} />
            </button>
          </div>
        )}

        {/* API Keys Section */}
        <section className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold mb-6 dark:text-white flex items-center gap-2">
            <Shield size={20} className="text-blue-500" /> Github Config
          </h2>

          <div className="space-y-6">
            {/* GitHub Repository */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <BrandIcon icon={siGithub} size={16} /> GitHub Repository URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="repo_url"
                  value={newRepoUrl}
                  onChange={(e) => setNewRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  autoComplete="off"
                />
                <button
                  onClick={handleAddRepo}
                  disabled={isAddingRepo || loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {isAddingRepo || loading ? "Adding..." : "Add"}
                </button>
              </div>
            </div>

            {/* GitHub PAT */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Key size={16} /> GitHub Personal Access Token
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  name="github_token"
                  value={newToken}
                  onChange={(e) => setNewToken(e.target.value)}
                  placeholder={token ? "Token is configured (ghp_...)" : "ghp_..."}
                  className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                />
                <button
                  onClick={handleSaveToken}
                  disabled={isSavingToken}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {isSavingToken ? "Saving..." : "Save"}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Create a <a href="https://github.com/settings/tokens" target="_blank" className="text-blue-500 hover:underline">Classic Token</a> with `repo` scope.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold mb-6 dark:text-white flex items-center gap-2">
            <Shield size={20} className="text-blue-500" /> Gemini Config
          </h2>
          <div className="space-y-6">
            {/* Gemini API Key */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Zap size={16} /> Gemini API Key
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={newGeminiApiKey}
                  onChange={(e) => setNewGeminiApiKey(e.target.value)}
                  placeholder={geminiApiKey ? "API Key is set" : "Enter Gemini API Key"}
                  className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                />
                <button
                  onClick={handleSaveGeminiApiKey}
                  disabled={isSavingGeminiKey}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {isSavingGeminiKey ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
            {/* Gemini Model Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Zap size={16} /> Gemini Model
              </label>
              <div className="flex gap-2">
                <CustomSelect
                  options={modelOptions}
                  value={model} // Use local state 'model' for the dropdown's value
                  onChange={setModel} // Update local state 'model' on change
                  className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                />
                <button
                  onClick={handleSaveGeminiModel}
                  disabled={isSavingGeminiKey} // Re-using state for saving model
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {isSavingGeminiKey ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="space-y-6">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">
              Appearance
            </h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setTheme("light")}
                className={`px-4 py-2 rounded-lg border ${theme === "light" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 dark:border-slate-700 dark:text-gray-300"
                  }`}
              >
                Light Mode
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`px-4 py-2 rounded-lg border ${theme === "dark" ? "border-blue-500 bg-slate-700 text-white" : "border-gray-200 dark:border-slate-700 dark:text-gray-300"
                  }`}
              >
                Dark Mode
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}