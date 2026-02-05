import { createSupabaseClient } from '@/lib/supabase/server';
import GitRepos from '@/components/gitRepos';
import { getUserRepositories } from '@/lib/supabase';
import { Repository } from '@/types';
import { getProfileSettings } from '@/app/actions/actions';

export default async function Dashboard() {
  const supabase = await createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialRepos: Repository[] = [];
  let initialRepo: Repository | null = null;
  let initialToken: string | null = null;

  if (user) {
    try {
      initialRepos = await getUserRepositories(supabase, user.id);
      if (initialRepos && initialRepos.length > 0) {
        initialRepo = initialRepos[0];
      }
      const settings = await getProfileSettings();
      if (settings) {
        initialToken = settings.github_pat;
      }
    } catch (error) {
      console.error("Error fetching repositories:", error);
    }
  }

  return <GitRepos initialUser={user} initialRepo={initialRepo} initialRepositories={initialRepos} initialToken={initialToken} />;
}
