# Project memory

## Product intent & audience

- LifeOS: AI-powered personal life administration assistant for individuals.
- Core jobs: organize documents, track deadlines/reminders, retrieve information via AI, manage reusable personal info securely.
- Designed as a production-grade full-stack app, not a demo.

## Brand personality & voice

- Calm, competent, trustworthy personal assistant tone.
- Clear empty/loading/not-configured states over silent failures.

## Visual design & UX direction

- Responsive shell: desktop sidebar nav, mobile bottom nav, tablet-adaptive layouts.
- Fully featured pages: landing, auth (signup/login/forgot password), onboarding, dashboard, documents, Ask AI, reminders, checklists, vault, settings.
- Documents: drag-and-drop upload, list with search/filter/sort, detail view with editable fields, preview, rename, delete.
- Reminders: upcoming/overdue/completed tabs + calendar view.
- Checklists: AI-generated, situation-based, with progress tracking.
- Vault: masked values with reveal-on-click.
- Ask AI: conversational chat grounded in user documents, conversation history, source citations.

## Decisions, constraints & rationale

- Backend: Supabase (database with RLS on all tables, private storage bucket, deployed edge functions).
- AI: Google Gemini via edge functions; `GEMINI_API_KEY` Supabase secret required for real AI output.
- Graceful degradation: AI features show explicit "not configured" state without key; dashboard falls back to rule-based insights computed from document expiry dates and reminders.
- `ExtractedJson` type includes a `category` field returned by the document-extraction edge function.
- Global UI constraints (JSX + Tailwind, lucide-react icons, `@/` path alias) are defined in `.bolt/prompt` and not restated here.

## Open questions & assumptions

- Gemini key provisioning is the only remaining manual setup step; assumed not yet configured in deployed environment.
- RLS policies and edge function deployment are assumed complete/valid; no schema migrations pending.
- No automated tests mentioned; build/typecheck used as the verification gate.