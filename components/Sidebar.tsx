
import { headers } from 'next/headers';
import { createSupabaseClient } from '@/lib/supabase/server';
import SidebarFooter from "./SidebarFooter";

const Sidebar = async () => {
  const headerList = await headers();
  const pathname = headerList.get('x-pathname') || '/';

  const supabase = await createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { path: '/issues', label: 'Issues', icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { path: '/pulls', label: 'Pull Requests', icon: 'M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2' },
    { path: '/ci', label: 'CI/CD Pipelines', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
    { path: '/docs', label: 'Documentation', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { path: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  ];

  return (
    <div className="w-64 h-screen bg-github-darker border-r border-github-border flex flex-col sticky top-0 z-50">
      <div className="p-6 border-b border-github-border flex items-center gap-3">
        <div className="w-8 h-8 bg-github-purple rounded flex items-center justify-center text-white font-bold">G</div>
        <h1 className="text-xl font-bold tracking-tight text-github-fg">GitMind</h1>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          return (
            <a
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive
                ? 'bg-github-border text-github-fg'
                : 'text-github-text hover:bg-github-border hover:text-github-fg'
                }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span className="font-medium text-sm">{item.label}</span>
            </a>
          );
        })}
      </nav>

      <SidebarFooter initialUser={user} />
    </div>
  );
};

export default Sidebar;