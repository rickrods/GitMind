import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { RepoProvider } from "@/components/providers/RepoContext"
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "GitMind",
  description: "AI github manager using Gemini 3",
  keywords: ["git", "github", "ai", "gemini", "codebase", "manager", "developer tools"],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: 'GitMind',
    description: 'AI github manager using Gemini 3',
    url: defaultUrl,
    siteName: 'GitMind',
    images: [
      {
        url: '/opengraph-image.png', // Placeholder, should be replaced with real asset path
        width: 1200,
        height: 630,
        alt: 'GitMind Dashboard',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" disableTransitionOnChange>
          <RepoProvider>
            <div className="flex">
              <Sidebar />
              <main className="flex-1">
                {children}
              </main>
            </div>
          </RepoProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
