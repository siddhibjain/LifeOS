# LifeOS — Your Life, Beautifully Organized

An AI-powered personal life administration assistant that helps you organize documents, understand their contents, track expiry dates, manage reminders, generate life checklists, and retrieve personal information through AI.

## Features

- **Landing page** — elegant marketing page with hero, features, how-it-works, and privacy sections.
- **Authentication** — email/password sign up, login, forgot password, and reset via Supabase Auth.
- **Onboarding** — collect full name, country, phone, reminder intervals, and interests.
- **Dashboard** — personalized greeting, document stats, AI-generated insights (with rule-based fallback), recent documents, category breakdown, quick actions, and overdue reminders.
- **Documents** — upload PDF/JPG/PNG via drag-and-drop or file picker, AI extraction (Gemini), search/filter/sort, document detail with editable fields, preview, rename, and delete.
- **Ask AI** — conversational interface grounded in your uploaded documents, with conversation history and source citations.
- **Reminders** — full CRUD, upcoming/overdue/completed list views, calendar view, priority, linked documents.
- **Checklists** — AI-generated situation-based checklists (college, travel, visa, etc.), item tracking with progress bars, add/edit/delete items.
- **Personal Vault** — store reusable personal information with masked values and reveal-on-click.
- **Settings** — profile editing, reminder preferences, notification toggle, security info, data export (JSON), account deletion.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS (custom soft-luxury theme)
- Lucide React icons
- Supabase (Auth, PostgreSQL, Storage, Edge Functions)
- Google Gemini API (via Edge Functions)

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (already provisioned in this Bolt environment)
- A Google Gemini API key

### Installation

```bash
npm install
npm run dev
```

### Environment Variables

The following are pre-populated in `.env` by the Bolt environment:

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The Supabase service role key and database URL are available server-side automatically.

### Gemini API Key

For AI features to work (document extraction, Ask AI, checklist generation, insights), you need to set the `GEMINI_API_KEY` edge function secret:

1. Go to your Supabase project dashboard.
2. Navigate to Edge Functions → Secrets.
3. Add a secret named `GEMINI_API_KEY` with your Google Gemini API key value.

Without this key, the app still works — AI features show a "not configured" state, and the dashboard falls back to rule-based insights computed from your real document data.

### Database Setup

The database migrations are already applied via the Supabase MCP tools. They create:

- `profiles`, `documents`, `extracted_document_data`, `reminders`, `checklists`, `checklist_items`, `vault_entries`, `ai_conversations`, `ai_messages` tables
- Row Level Security on all tables (owner-scoped via `auth.uid()`)
- A private storage bucket `lifeos-documents` with per-user path policies
- Updated-at triggers on all mutable tables

### Storage Setup

The `lifeos-documents` storage bucket is created as **private** (not public). Files are stored under `{user_id}/{filename}` paths. Access is controlled by storage policies that match the first path segment to `auth.uid()`.

### Edge Functions

Four edge functions are deployed:

- `ai-extract` — document classification and structured extraction
- `ai-ask` — question answering over user documents
- `ai-checklist` — situation-based checklist generation
- `ai-insights` — personalized life insights from user data

All functions verify the JWT, load the user's data server-side, and proxy Gemini API calls without exposing the API key to the browser.

## Design

- **Colors**: warm ivory (#F8F6F1), champagne gold (#C6A875), espresso (#39332E), sage green, dusty rose, muted taupe
- **Typography**: DM Serif Display for headings, Inter for body
- **Responsive**: mobile-first with bottom navigation, tablet-adaptive, desktop sidebar layout

## Build

```bash
npm run build      # production build
npm run typecheck   # TypeScript check
```

## Project Structure

```
src/
  components/       # Reusable UI: Modal, ConfirmDialog, Skeleton, EmptyState, Spinner, Sidebar, BottomNav, AppHeader, Logo
  lib/              # Supabase client, auth context, toast, types, services, AI functions, utilities
  pages/            # Landing, Auth, Onboarding, Dashboard, Documents, AskAi, Reminders, Checklists, Vault, Settings
  App.tsx           # Router + auth gating
  main.tsx          # Entry point with providers
supabase/
  functions/        # Edge functions (ai-extract, ai-ask, ai-checklist, ai-insights)
  migrations/       # Database schema + storage migrations
```

## Security

- Row Level Security on every user-owned table
- Private storage bucket with per-user path policies
- API keys stored as edge function secrets (never in frontend code)
- User data isolation enforced at the database level
- Document contents treated as untrusted data (never followed as instructions)
