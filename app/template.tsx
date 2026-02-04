import Sidebar from "@/components/Sidebar";
import { headers } from "next/headers";

// Force this template to be dynamic so it re-renders on every navigation
export const dynamic = 'force-dynamic';

export default async function Template({ children }: { children: React.ReactNode }) {
    // Get the pathname to use as a key - this forces Sidebar to remount on navigation
    const headerList = await headers();
    const pathname = headerList.get('x-pathname') || '/';

    return (
        <div className="flex">
            <Sidebar key={pathname} />
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}
