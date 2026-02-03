
"use client";

import React from 'react';
import { RepoProvider } from "@/components/providers/RepoContext";
import { ThemeProvider } from "next-themes";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <RepoProvider>
        {children}
      </RepoProvider>
    </ThemeProvider>
  );
}
