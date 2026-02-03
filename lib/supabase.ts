import { SupabaseClient } from '@supabase/supabase-js'; //typescript type
import { Repository } from '@/types';
import { createSupabaseClient } from '@/lib/supabase/client'
/**
 * Subscribes to auth state changes.
 * @param supabase Supabase client (client-side)
 * @param callback Function to call when auth state changes
 * @returns Subscription object with unsubscribe method
 */

export const supabase = createSupabaseClient() as SupabaseClient;

export const subscribeToAuthChanges = (callback: (event: string, session: any) => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return subscription;
};

/**
 * Gets the current active session.
 */
export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

/**
 * Fetches all repositories for a user from the database.
 * @param userId User ID
 */
export const getUserRepositories = async (supabase: SupabaseClient, userId: string): Promise<Repository[]> => {
  const { data: repos, error } = await supabase
    .from('user_repositories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!repos) return [];

  // Map DB response to Repository type
  return repos.map(r => ({
    id: Number(r.github_repo_id),
    name: r.name,
    full_name: r.full_name,
    owner: {
      login: r.owner,
      avatar_url: r.avatar_url || '',
      url: `https://api.github.com/users/${r.owner}`,
      id: 0 // Placeholder
    },
    html_url: `https://github.com/${r.full_name}`,
    url: `https://api.github.com/repos/${r.full_name}`,
    description: r.description,
    language: r.language,
    stargazers_count: r.stargazers_count,
    default_branch: r.default_branch,
    updated_at: r.last_synced_at,
    // Add other required fields with defaults or mapping as needed
    private: false,
    fork: false,
    created_at: r.created_at,
    pushed_at: r.last_synced_at,
    size: 0,
    watchers_count: 0,
    forks_count: 0,
    open_issues_count: 0,
    homepage: null
  } as unknown as Repository));
};

/**
 * Inserts a new repository into the user's list.
 * @param supabase Supabase client
 * @param userId User ID
 * @param repo Repository object
 * @param isCurrent Whether this is the current active repo
 */
export const insertUserRepository = async (supabase: SupabaseClient, userId: string, repo: Repository, isCurrent: boolean) => {
  const { error } = await supabase.from('user_repositories').insert({
    user_id: userId,
    github_repo_id: repo.id,
    owner: repo.owner.login,
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description,
    language: repo.language,
    last_synced_at: repo.updated_at,
    stargazers_count: repo.stargazers_count,
    avatar_url: repo.owner.avatar_url,
    default_branch: repo.default_branch,
    is_current: isCurrent
  });

  if (error) throw error;
};

/**
 * Removes a repository from the user's list.
 * @param supabase Supabase client
 * @param userId User ID
 * @param repoId Repository ID (GitHub ID)
 */
export const deleteUserRepository = async (supabase: SupabaseClient, userId: string, repoId: number) => {
  const { error } = await supabase
    .from('user_repositories')
    .delete()
    .eq('user_id', userId)
    .eq('github_repo_id', repoId);

  if (error) throw error;
};

/**
 * Updates the 'current' repository status.
 * @param supabase Supabase client
 * @param userId User ID
 * @param repoId Repository ID (GitHub ID)
 */
export const updateCurrentRepository = async (supabase: SupabaseClient, userId: string, repoId: number) => {
  // First set all to false
  await supabase.from('user_repositories').update({ is_current: false }).eq('user_id', userId);
  // Then set the target to true
  const { error } = await supabase
    .from('user_repositories')
    .update({ is_current: true })
    .eq('user_id', userId)
    .eq('github_repo_id', repoId);

  if (error) throw error;
};