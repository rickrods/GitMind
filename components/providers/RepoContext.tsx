"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Repository } from '@/types'; //typescript type
import { SupabaseClient } from '@supabase/supabase-js'; //typescript type
import { GitHubService, parseGitHubUrl } from '@/utils/github';
import { User } from '@supabase/supabase-js';
import { getProfileSettings, saveEncryptedSecret, saveProfileSetting } from '@/app/actions/actions';
import { createSupabaseClient } from '@/lib/supabase/client';
import {
  getUserRepositories,
  insertUserRepository,
  deleteUserRepository,
  updateCurrentRepository
} from '@/lib/supabase';

interface RepoContextType {
  token: string | null;
  setToken: (token: string) => Promise<void>;
  getGitHubToken: () => Promise<string | null>;
  geminiApiKey: string | null;
  setGeminiApiKey: (key: string) => Promise<void>;
  getGeminiApiKey: () => Promise<string | null>;
  geminiModel: string | null;
  setGeminiModel: (model: string) => Promise<void>;
  getGeminiModel: () => Promise<string | null>;
  repositories: Repository[];
  currentRepo: Repository | null;
  setCurrentRepo: (repo: Repository) => Promise<void>;
  addRepository: (url: string) => Promise<void>;
  removeRepository: (id: number) => Promise<void>;
  githubService: GitHubService | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  setError: (error: string) => void;
  user: User | null;
}

const RepoContext = createContext<RepoContextType | undefined>(undefined);
// const supabase = createSupabaseClient() as SupabaseClient;

export const RepoProvider = ({ children }: { children: ReactNode }) => {
  // Create a single supabase client for this provider instance
  const [supabase] = useState(() => createSupabaseClient());

  const [token, setTokenState] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKeyState] = useState<string | null>(null);
  const [geminiModel, setGeminiModelState] = useState<string | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [currentRepo, setCurrentRepoState] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Initial session check and auth listener
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const initialUser = session?.user || null;
        console.log("RepoContext: Initial session check, user found:", initialUser?.id);
        setUser(initialUser);

        if (initialUser) {
          await fetchUserData(initialUser.id, supabase);
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error("RepoContext: Init error", e);
        setLoading(false);
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("RepoContext: Auth event:", event, "User:", session?.user?.id);
        const currentUser = session?.user || null;
        setUser(currentUser);

        if (currentUser && event === 'SIGNED_IN') {
          await fetchUserData(currentUser.id, supabase);
        } else if (event === 'SIGNED_OUT') {
          setTokenState(null);
          setGeminiApiKeyState(null);
          setGeminiModelState(null);
          setRepositories([]);
          setCurrentRepoState(null);
          setLoading(false);
        }
      });

      return () => subscription.unsubscribe();
    };

    init();
  }, [supabase]);

  const fetchUserData = async (userId: string, supabaseClient: SupabaseClient) => {
    setLoading(true);
    console.log("RepoContext: Fetching user data for:", userId);
    try {
      // Use Server Action to get decrypted settings (Wrap in try/catch so it doesn't block repo fetch)
      try {
        const settings = await getProfileSettings();
        if (settings) {
          setTokenState(settings.github_pat);
          setGeminiApiKeyState(settings.gemini_api_key);
          setGeminiModelState(settings.gemini_model || 'gemini-3-flash-preview');
        }
      } catch (settingsError) {
        console.warn("RepoContext: Failed to load settings (non-critical):", settingsError);
      }

      // Fetch repositories using lib/supabase
      const mappedRepos = await getUserRepositories(supabaseClient, userId);
      setRepositories(mappedRepos);

      // Determine current repo by checking the is_current flag
      const savedCurrentRepo = mappedRepos.find(r => r.is_current);
      if (savedCurrentRepo) {
        setCurrentRepoState(savedCurrentRepo);
      } else if (mappedRepos.length > 0) {
        setCurrentRepoState(mappedRepos[0]);
      } else {
        setCurrentRepoState(null);
      }

    } catch (err) {
      console.error("RepoContext: Failed to load user data:", err);
    } finally {
      setLoading(false);
    }
  };

  const githubService = token ? new GitHubService(token) : null;

  const setToken = async (newToken: string) => {
    if (!user) {
      console.error("RepoContext: Cannot save token, no user logged in.");
      setError("Please sign in to save settings.");
      return;
    }

    console.log("RepoContext: Saving GitHub PAT...");
    try {
      await saveEncryptedSecret('github_pat', newToken);
      console.log("RepoContext: GitHub PAT saved successfully.");
      setTokenState(newToken);
    } catch (err: any) {
      console.error("RepoContext: Save error:", err);
      setError(`Failed to save token: ${err.message}`);
    }
  };

  const setGeminiApiKey = async (newKey: string) => {
    if (!user) {
      console.error("RepoContext: Cannot save Gemini key, no user logged in.");
      setError("Please sign in to save settings.");
      return;
    }

    console.log("RepoContext: Saving Gemini Key...");
    try {
      await saveEncryptedSecret('gemini_api_key', newKey);
      console.log("RepoContext: Gemini Key saved successfully.");
      setGeminiApiKeyState(newKey);
    } catch (err: any) {
      console.error("RepoContext: Save error:", err);
      setError(`Failed to save key: ${err.message}`);
    }
  };

  const setGeminiModel = async (newModel: string) => {
    if (!user) {
      console.error("RepoContext: Cannot save Gemini model, no user logged in.");
      setError("Please sign in to save settings.");
      return;
    }

    console.log("RepoContext: Saving Gemini Model...");
    try {
      await saveProfileSetting('gemini_model', newModel);
      console.log("RepoContext: Gemini Model saved successfully.");
      setGeminiModelState(newModel);
    } catch (err: any) {
      console.error("RepoContext: Save error:", err);
      setError(`Failed to save model: ${err.message}`);
    }
  };

  const getGitHubToken = async (): Promise<string | null> => {
    if (!user) return null;
    try {
      if (token) return token;
      const settings = await getProfileSettings();
      return settings?.github_pat || null;
    } catch (err) {
      console.error("RepoContext: Failed to get GitHub Token:", err);
      return null;
    }
  };

  const getGeminiApiKey = async (): Promise<string | null> => {
    if (!user) return null;
    try {
      if (geminiApiKey) return geminiApiKey;
      const settings = await getProfileSettings();
      return settings?.gemini_api_key || null;
    } catch (err) {
      console.error("RepoContext: Failed to get Gemini API Key:", err);
      return null;
    }
  };

  const getGeminiModel = async (): Promise<string | null> => {
    if (!user) return null;
    try {
      if (geminiModel) return geminiModel;
      const settings = await getProfileSettings();
      return settings?.gemini_model || null;
    } catch (err) {
      console.error("RepoContext: Failed to get Gemini Model:", err);
      return null;
    }
  };

  const setCurrentRepo = async (repo: Repository) => {
    // Fallback: If state user is null (e.g. right after sign-in/refresh before effect runs), check supabase directly
    let currentUser = user;
    if (!currentUser) {
      const { data } = await supabase.auth.getUser();
      currentUser = data.user;
    }

    if (!currentUser) return;

    setCurrentRepoState(repo);
    try {
      await updateCurrentRepository(supabase, currentUser.id, repo.id);
    } catch (e) {
      console.error("Failed to update current repo ref", e);
    }
  };

  const addRepository = async (url: string) => {
    if (!user || !githubService) {
      setError("Configure settings first.");
      return;
    }

    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      setError("Invalid URL.");
      return;
    }

    setLoading(true);
    try {
      const repo = await githubService.fetchRepoDetails(parsed.owner, parsed.repo);
      await insertUserRepository(supabase, user.id, repo, repositories.length === 0);

      setRepositories(prev => [...prev, repo]);
      if (repositories.length === 0) setCurrentRepoState(repo);
      setError(null);
    } catch (err: any) {
      console.error("RepoContext: Add repo error:", err);
      setError(err.message || "Failed to add repo.");
    } finally {
      setLoading(false);
    }
  };

  const removeRepository = async (id: number) => {
    if (!user) return;
    try {
      await deleteUserRepository(supabase, user.id, id);
      const updated = repositories.filter(r => r.id !== id);
      setRepositories(updated);
      if (currentRepo?.id === id) setCurrentRepoState(updated.length > 0 ? updated[0] : null);
    } catch (e) {
      setError("Failed to remove repo.");
    }
  };

  const clearError = () => setError(null);

  return (
    <RepoContext.Provider value={{
      token,
      setToken,
      getGitHubToken,
      geminiApiKey,
      setGeminiApiKey,
      getGeminiApiKey,
      geminiModel,
      setGeminiModel,
      getGeminiModel,
      repositories,
      currentRepo,
      setCurrentRepo,
      addRepository,
      removeRepository,
      githubService,
      loading,
      error,
      clearError,
      setError,
      user
    }}>
      {children}
    </RepoContext.Provider>
  );
};

export const useRepo = () => {
  const context = useContext(RepoContext);
  if (!context) throw new Error('useRepo must be used within a RepoProvider');
  return context;
};
