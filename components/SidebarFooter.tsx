"use client";

import React from 'react';
import Link from 'next/link';
import { useRepo } from '@/components/providers/RepoContext';
import AuthPageSignOutButton from "./auth-sign-out-button";
import { Button } from "@/components/ui/button";
import { ThemeToggleButton } from "./theme-toggle-button";
import { User } from '@supabase/supabase-js';

export default function SidebarFooter({ initialUser }: { initialUser: User | null }) {
    const { error, clearError, user: contextUser } = useRepo();

    // Use context user if available, fallback to initialUser from server
    const user = contextUser || initialUser;

    return (
        <div className="p-4 border-t border-github-border space-y-3">
            {error && (
                <div className="p-2 bg-red-900/50 border border-red-500 rounded text-[10px] text-red-200 mb-2 relative">
                    {error}
                    <button onClick={clearError} className="absolute top-1 right-1 hover:text-white">x</button>
                </div>
            )}
            <div className="flex items-center justify-between">
                <ThemeToggleButton />
                {user && <span className="text-[10px] text-github-text truncate max-w-[100px]">{user.email}</span>}
            </div>
            {user ? (
                <AuthPageSignOutButton />
            ) : (
                <Button asChild className="w-full">
                    <Link href="/sign-in">Sign in</Link>
                </Button>
            )}
        </div>
    );
}
