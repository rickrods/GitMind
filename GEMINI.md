# GEMINI.md

## Project Overview

**ThirdEye Repo** is a full-stack Next.js SaaS starter designed for intelligent repository management. It integrates with GitHub and Google's Gemini AI to provide automated issue triage, technical analysis, and code review capabilities. The application features a persistent layer for user settings and repository lists, ensuring a seamless experience across devices.

### Core Technologies
- **Framework:** [Next.js](https://nextjs.org/) (App Router, v16+)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Authentication & Database:** [Supabase](https://supabase.com/) (Auth, PostgreSQL, RLS)
- **AI Engine:** [Google Gemini](https://ai.google.dev/) (via `@google/genai` and Vercel AI SDK)
- **Integration:** [GitHub API](https://docs.github.com/en/rest) (via custom service and Octokit)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)
- **State Management:** React Context (`RepoContext`) and Custom Hooks

### Key Features
- **AI Issue Triage:** Automatically analyzes GitHub issues for clarity and missing information.
- **Deep Analysis:** Proposes technical fixes and implementation plans based on repository structure.
- **Code Review:** Performs rigorous PR reviews with quality scoring and logic checks.
- **AI Proposas:** Generates concrete code changes (full file content) and creates branches/PRs.
- **Secure Persistence:** Encrypted storage of GitHub PATs and Gemini API keys in Supabase.

---

## Building and Running

### Prerequisites
- Node.js 18+
- npm or pnpm
- Supabase Project (URL and Service Role/Publishable keys)

### Installation
```bash
npm install
```

### Environment Setup
Create a `.env.local` file with the following keys:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key
# Internal encryption key for secrets (32 bytes base64)
ENCRYPTION_KEY=your_base64_encryption_key 
```

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run start
```

### Linting
```bash
npm run lint
```

---

## Development Conventions

### Architecture & Structure
- **App Router:** Follow Next.js App Router conventions. Prefer Server Components for data fetching.
- **Server Actions:** All mutations, AI calls, and database operations should reside in `app/actions/`. Use `"use server"` directive.
- **Client State:** Use the `RepoProvider` (`components/providers/RepoContext.tsx`) for global application state (current repo, user tokens).
- **Supabase Clients:**
    - Use `lib/supabase/server.ts` for server-side operations (Actions, API routes).
    - Use `lib/supabase/client.ts` for client-side operations (Hooks, Components).

### Security
- **Secrets:** Never store raw API keys or PATs in the database. Use the `encrypt` and `decrypt` utilities in `utils/encryption.ts` before saving to the `profiles` table.
- **RLS:** All tables in Supabase have Row Level Security (RLS) enabled. Ensure policies are respected when querying.

### AI Implementation
- **Models:** Primarily uses `gemini-3-flash-preview` for speed (triage, simple analysis) and `gemini-3-pro-preview` for complex tasks (reviews, documentation).
- **Structured Output:** Leverage `responseSchema` and `responseMimeType: "application/json"` in Gemini calls to ensure predictable AI responses.

### UI/UX
- **Components:** Use shadcn/ui components located in `components/ui/`.
- **Icons:** Use `lucide-react` for standard icons and `BrandIcon.tsx` for third-party logos.
- **Feedback:** Use `react-hot-toast` for user notifications and `spinner.tsx` for loading states.

### Data Modeling
- **Profiles:** Stores encrypted credentials and user-specific settings.
- **User Repositories:** Links Supabase users to GitHub repositories.
- **Issue Analyses:** Persists AI-generated reports and proposals.
