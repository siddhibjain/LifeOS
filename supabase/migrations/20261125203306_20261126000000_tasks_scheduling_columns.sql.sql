/*
# Add scheduling columns to tasks table

## Purpose
Adds columns to support AI-powered auto-scheduling of tasks: estimated duration,
and the assigned start/end time slots. These let the Action Center's "Auto-Allot
Tasks" feature persist a generated schedule so the user can see when each task
should be worked on.

## Changes to existing tables
- `tasks`:
  - `estimated_duration_minutes` (integer, nullable): AI-estimated effort in
    minutes. Null means not yet estimated.
  - `scheduled_start` (timestamptz, nullable): when the scheduler proposes the
    task should begin.
  - `scheduled_end` (timestamptz, nullable): when the scheduler proposes the
    task should finish. Always `scheduled_start + estimated_duration_minutes`
    after a successful auto-allot run.

## Security
- No new tables. The existing tasks RLS policies (owner-scoped,
  `TO authenticated`) already cover these new columns because policies are
  table-level. No additional policies required.
- Existing grants on `tasks` already include the full column set for
  `authenticated`, so the new columns are immediately readable/writable by the
  owning user. No grant changes needed.
*/

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS scheduled_start timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_end timestamptz;
