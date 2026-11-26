LifeOS Personal Assistant (Paperless Pal) --- Audit Plan
Project identity: LifeOS Personal Assistant (original concept:
Paperless Pal)
Audit status: Pending repository inspection and end-to-end
verification
Purpose: Compare the actual implementation with the approved project
blueprint, capstone requirements, and current implementation priorities.
This file is an audit checklist, not a claim that features are
complete. Mark a feature as verified only after inspecting its
implementation and testing it with real data.

1. Product vision and scope
Paperless Pal / LifeOS is an AI-powered personal administration
platform. It converts everyday documents, screenshots, receipts, bills,
notices, and confirmations into organized information, user-approved
responsibilities, connected workflows, and reminders.

Core promise: Upload something important; the system helps determine
what it means, what action may be needed, when it is due, and how to
track completion.

The product is intended for individual users managing personal,
educational, household, financial, insurance, travel, warranty, and
other administrative responsibilities.
2. Audit method and rules
- Inspect the existing repository before editing.
- Trace each feature from UI → frontend logic → backend/API →
  database/storage.
- Reuse existing components, tables, policies, and functions where
  suitable.
- Do not rebuild the application or redesign working screens during an
  audit.
- Do not use mock data or placeholder actions as evidence of
  functionality.
- Do not reset, replace, or migrate the existing database without
  explicit approval and a verified migration/backup plan.
- Never expose API keys, service-role credentials, private tokens, or
  user documents.
- Record file paths, function names, root causes, test evidence, and
  remaining blockers.
- Distinguish implemented, tested, and verified in the
  deployed app.
- AI may suggest information and actions; the application validates
  them; the user approves consequential actions.
3. Status legend
Use one status for each item:
- NOT AUDITED
- MISSING
- PARTIAL
- IMPLEMENTED — NOT TESTED
- TESTED — PASS
- FAIL
- BLOCKED — CONFIGURATION
- NOT IN MVP SCOPE
Do not mark TESTED — PASS without running the relevant test.
4. Feature audit checklist
4.1 Authentication and user data isolation --- P0
- [ ] Sign-up and login
- [ ] Logout and session handling
- [ ] Protected routes
- [ ] Password reset / recovery, if included
- [ ] User profile and preferences
- [ ] Every private record is scoped to the authenticated user
- [ ] Database access policies / RLS reviewed
- [ ] Users cannot read or modify another user's records
- [ ] Authentication failures display useful, safe errors
4.2 Overview dashboard --- P1
- [ ] Real document count
- [ ] Real pending-action count
- [ ] Upcoming deadlines
- [ ] Expiring documents / renewals
- [ ] Items needing attention
- [ ] Recently uploaded documents
- [ ] Daily briefing uses real user records (if implemented)
- [ ] No illustrative/demo values presented as real data
- [ ] Loading, empty, and error states
4.3 SmartDrop --- intelligent document inbox --- P1
Supported input types in the product blueprint include PDFs,
images/screenshots, bills, receipts, college notices, warranty cards,
and booking confirmations.
- [ ] Upload and file validation
- [ ] PDF and image processing
- [ ] Secure, private storage
- [ ] Upload progress and error recovery
- [ ] Document preview / download with authorization
- [ ] Automatic document categorization
- [ ] Categories: identity, education, finance/bills, insurance,
  shopping/warranties, travel/bookings, healthcare, other
- [ ] Search by document name
- [ ] Semantic search only if actually implemented
- [ ] Category filtering
- [ ] Extracted information is viewable and editable
- [ ] Link document to related tasks
- [ ] Archive and delete behavior
- [ ] Deletion handles associated records and stored files safely
4.4 Gemini document intelligence --- P1
- [ ] Gemini call is server-side; key is not exposed to browser code
- [ ] PDF/image is sent through the intended backend path
- [ ] Structured extraction includes document type and title
- [ ] Important dates/events are extracted
- [ ] Suggested actions include title, priority, due date, source, and
  confirmation requirement where applicable
- [ ] Evidence/source text is retained for important extracted dates
- [ ] Dates, amounts, and required fields are validated
- [ ] Ambiguous or missing dates are flagged instead of guessed
- [ ] Confidence/missing-information handling is implemented where
  designed
- [ ] Malformed AI output and API failures are handled
- [ ] User can review and correct extraction
- [ ] Extracted information persists to the database
4.5 Action Engine and Action Center --- P0/P1
The Action Engine turns document findings and manually entered
responsibilities into trackable tasks.
- [ ] Create tasks from approved document suggestions
- [ ] Manual task creation
- [ ] Edit and delete tasks
- [ ] Link each document-derived task to its source document
- [ ] Priority and deadline fields
- [ ] Reminder settings
- [ ] Task statuses: Not started, In progress, Waiting for response,
  Completed
- [ ] Status changes persist
- [ ] Tasks are scoped to the correct user
- [ ] Duplicate task generation is prevented or handled
Automatic task allotment --- current implementation priority
- [ ] Visible Auto-Allot Tasks control is connected to real logic
- [ ] Reads eligible tasks from the database (not mock data)
- [ ] Uses deadlines, priorities, estimated durations, dependencies,
  and user availability when those fields/settings exist
- [ ] Assigns realistic dates/time slots
- [ ] Prevents schedule overlap
- [ ] Balances workload within configured limits
- [ ] Respects dependencies and blocked tasks
- [ ] Handles unschedulable tasks transparently
- [ ] Saves schedule to persistent storage
- [ ] Re-running does not create duplicate assignments
- [ ] Incomplete/overdue tasks can be rescheduled safely
- [ ] User can review, adjust, and approve the proposed schedule
- [ ] Success message appears only after save succeeds
- [ ] Scheduling errors are visible and recoverable
4.6 LifeGraph --- responsibilities and dependencies --- P1
- [ ] Task/document relationships are stored or derived correctly
- [ ] Task details show source document
- [ ] Dependencies are visible
- [ ] Missing prerequisites are identified
- [ ] Next recommended action is grounded in actual task state
- [ ] Interactive node-and-connection visualization works
- [ ] Graph remains understandable for small MVP datasets
- [ ] Dependency cycles or invalid links are handled
4.7 Deadline Intelligence and Calendar --- P1
- [ ] Monthly calendar
- [ ] Upcoming deadlines
- [ ] Renewal dates
- [ ] Task schedule display
- [ ] Reminder preferences
- [ ] Urgency considers deadline proximity, task completion,
  preparation time, prerequisites, and user priority where data exists
- [ ] Date/time-zone handling is consistent
- [ ] Calendar and Action Center use consistent persisted data
4.8 FollowUp Assistant --- P2
- [ ] Create follow-up record
- [ ] Request title and related document
- [ ] Date submitted
- [ ] Expected response date
- [ ] Status tracking
- [ ] Reminder when response is overdue
- [ ] Draft polite follow-up message
- [ ] User remains in control of sending messages or taking external
  actions
- [ ] Follow-up records persist
4.9 Reminders and notifications --- P1/P2
- [ ] Task deadline reminders
- [ ] Renewal/expiry reminders
- [ ] Follow-up reminders
- [ ] Correct trigger and delivery time
- [ ] No duplicate notifications
- [ ] Delivery status/history where implemented
- [ ] User notification preferences respected
- [ ] Email via Resend only if configured and included
- [ ] No false claim that a reminder was sent when delivery failed
4.10 Daily AI briefing --- P2
- [ ] Uses real pending responsibilities, deadlines, renewals, and
  blockers
- [ ] No fabricated counts or events
- [ ] Briefing explains urgency accurately
- [ ] AI output is bounded by available user data
- [ ] Errors and empty days are handled
5. Backend, database, and storage audit --- P0
Identify the actual provider currently used (for example, Bolt-managed
database or Supabase). Do not assume the provider based on a UI label or
an earlier plan.
- [ ] Existing backend/provider documented
- [ ] Connection configuration identified
- [ ] Schema and existing tables reviewed
- [ ] Migrations/versioning reviewed
- [ ] Foreign keys and relationships reviewed
- [ ] User ownership fields and access policies reviewed
- [ ] CRUD operations tested
- [ ] Storage buckets and access rules reviewed
- [ ] Edge/server functions listed and status checked
- [ ] Function logs reviewed for failures
- [ ] Secrets are configured in the correct environment
- [ ] Existing records and accounts preserved
- [ ] Backup/export and recovery procedure documented before migration
- [ ] New Bolt project points to intended backend only after
  connection is verified
Migration safety: A GitHub import transfers repository code, not
necessarily managed database records, storage objects, provider
settings, or secrets. Confirm each separately. Never click a destructive
database replacement/reset action without explicit user approval.
6. API and configuration audit
- [ ] Gemini API configured and functional
- [ ] Supabase/Bolt database credentials match the code's actual
  variable names
- [ ] Server-side secrets remain server-side
- [ ] No credentials committed to Git
- [ ] Production and preview environment variables checked separately
- [ ] API errors, rate limits, and timeouts handled
- [ ] API request/response validation
- [ ] No unnecessary external APIs added
Planned stack in the original blueprint: React, Tailwind CSS, Gemini
API, Supabase/PostgreSQL, Supabase Auth/Storage, and Vercel. Verify the
actual implementation rather than forcing a stack migration. Resend and
semantic search/pgvector were optional or later enhancements.
7. Security and privacy audit --- P0
- [ ] No hardcoded secrets
- [ ] No Gemini or service-role key in frontend bundle
- [ ] Database access policies reviewed
- [ ] Private documents are not publicly accessible
- [ ] File type/size validation
- [ ] Input validation and safe error messages
- [ ] Authorization checks on server functions
- [ ] Sensitive document content not unnecessarily logged
- [ ] User data deletion behavior reviewed
- [ ] No automatic payments, form submissions, or external
  communications without user approval
8. UI, accessibility, and reliability audit --- P2
- [ ] All navigation links work
- [ ] All visible buttons perform their stated action
- [ ] Forms validate input
- [ ] Loading, empty, success, and error states exist
- [ ] Responsive mobile and desktop layouts
- [ ] Keyboard/focus/accessibility basics
- [ ] No broken routes
- [ ] No critical browser console errors
- [ ] No repeated requests or avoidable performance problems
- [ ] Existing visual identity and working screens preserved
9. End-to-end test plan
Record test date, environment, test data, result, and evidence for each:
  Test                    Expected result         Status / evidence
  Register and sign in    Authenticated user      NOT AUDITED
session                 

  Open dashboard          Real user data loads    NOT AUDITED

  Upload PDF              Private file stored     NOT AUDITED

  Upload image            Private file stored     NOT AUDITED

  Extract document        Validated structured    NOT AUDITED
output                  

  Review extraction       User can                NOT AUDITED
correct/approve         

  Approve action          Task saved and linked   NOT AUDITED
to source               

  Add manual task         Task persists           NOT AUDITED

  Auto-allot tasks        Valid schedule saved    NOT AUDITED
without conflicts       

  Edit/complete task      Updated state persists  NOT AUDITED

  LifeGraph               Relationships display   NOT AUDITED
accurately              

  Calendar/reminder       Correct deadline and    NOT AUDITED
reminder                

  Create follow-up        Follow-up persists and  NOT AUDITED
tracks status           

  Refresh/re-login        Records remain          NOT AUDITED
available               

  User isolation          Other user's data       NOT AUDITED
inaccessible            
Production deployment   Live URL works          NOT AUDITED
10. Findings register
For every issue, add:
- ID
- Priority: P0 / P1 / P2 / P3
- Feature
- Status
- Observed behavior
- Expected behavior
- Root cause
- Affected files/functions
- Fix
- Test and evidence
- Remaining blocker
11. Priority order for remediation
1. P0: protect data, authentication, authorization, backend
   connectivity, and secrets.
2. P1: document upload and Gemini extraction; approved task creation;
   Action Center auto-allotment; persistence.
3. P1: calendar, deadlines, and reliable reminders.
4. P1/P2: LifeGraph and follow-up workflow.
5. P2: dashboard accuracy, daily briefing, usability, and performance.
6. P3: optional enhancements such as email provider, semantic search,
   and additional integrations.
12. Completion definition
The project is ready for submission only when the core workflows have
been tested with real records, data persists, user data is protected,
the live deployment works, and known limitations are documented.

Final instruction to the coding agent: Audit the actual codebase
against this document. Report truthful findings with paths and evidence.
Then fix issues in priority order using targeted changes. Do not rebuild
the project, invent test results, or risk existing user data.
