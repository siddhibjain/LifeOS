

1. Project details
- Project title: LifeOS Personal Assistant (original concept:
  Paperless Pal)
- Tagline: Your life, organized. Your responsibilities, handled.
- Student name: Siddhi Banthia Jain
- Roll / enrolment number: 25Bcon1390
- Team members: \(Siddhi and Praveen )
- GitHub repository:https://github.com/siddhibjain/LifeOS
- Live application:https://siddhibjain-lifeos-i-tbmw.bolt.host/
- Deployment platform: Vercel \(confirm actual platform\)
- Project status: \(Enter current verified status\)
2. Introduction and problem statement
People manage many everyday responsibilities through scattered
documents, screenshots, bills, receipts, notices, insurance policies,
warranty cards, and booking confirmations. Important dates and required
actions can be missed because information is stored in separate files
and reminders are created manually.

LifeOS Personal Assistant, originally designed as Paperless Pal, is an
AI-powered personal administration platform intended to turn these
unorganized documents into useful, trackable responsibilities.

The application aims to help users understand a document, identify
relevant information and possible actions, confirm suggested tasks, and
track deadlines and follow-ups in one place.

Target users: Students, working professionals, families, and
individuals managing personal or household administration.
3. Core features and intended workflow
SmartDrop --- Intelligent document inbox
Users upload PDFs, images, screenshots, bills, receipts, notices,
warranty cards, or confirmations. The application categorizes documents
and extracts relevant information for review.
Action Engine --- Documents to tasks
The application identifies possible actions such as paying a bill,
submitting a form, preparing for an appointment, or renewing a policy.
Suggested actions should be validated and approved by the user before
becoming tracked responsibilities.
Action Center
Users manage responsibilities, priorities, deadlines, and statuses: -
Not started - In progress - Waiting for response - Completed

Users can also create tasks manually.
Automatic task allotment
The current implementation goal is to schedule eligible tasks into
appropriate dates/time slots using available task information,
priorities, deadlines, durations, dependencies, and user availability.
The schedule must be saved, avoid conflicts, and remain editable by the
user.

LifeGraph
A task-and-document relationship view intended to show the source of a
responsibility, related tasks, prerequisites, and what needs to happen
next.
Deadline Intelligence and Calendar
A calendar and reminder workflow intended to help users track deadlines,
renewals, preparation time, incomplete tasks, and important upcoming
responsibilities.

FollowUp Assistant
Tracks requests such as refunds, applications, certificates, or service
issues by recording submission date, expected response date, status,
related document, and a draft follow-up message. Sending external
communications remains under user control.
4. AI document-processing workflow
The intended workflow is:
1. User uploads a PDF or image.
2. The file is stored securely.
3. Gemini analyzes the document through a protected backend.
4. The system requests structured information such as document type,
   title, dates, evidence, suggested actions, missing information, and
   confidence.
5. Backend validation checks output formats and uncertain or
   conflicting information.
6. User reviews and corrects the extracted information.
7. User approves suggested actions.
8. Approved tasks and reminders are saved and linked to the source
   document.
Design principle: AI suggests; the application validates; the user
approves.

5. System design and technology
Planned architecture
User → React interface → secure backend/API → Gemini document analysis →
validation and user approval → database and storage → Action Center,
LifeGraph, Calendar, and Follow-ups.
Planned technology stack
  Layer            Intended technology                    
  Frontend         React, Tailwind CSS                    
AI               Gemini API                              
Backend          Secure server/API functions             
Authentication   Supabase Auth or current provider       
Database         PostgreSQL / current managed database   
File storage     Private managed storage                  
Deployment       Vercel                                  

User
  |
  v
LifeOS Web Interface
  |
  v
Authenticated Backend / API
  |----------------------|
  v                      v
Gemini API          Database + Private Storage
  |                      |
  v                      v
Structured Output   Validated Documents / Tasks
  |                      |
  v                      v
Validation + User Approval
  |
  v
Action Center | LifeGraph | Calendar | Follow-ups

 6. Development Challenges and Solutions
 Challenge 1: Switching Between Bolt Accounts

- Problem encountered:** During the development of LifeOS, I faced a limitation with my initial Bolt account and decided to continue development using another Bolt account.
- Investigation:** I reviewed the project progress and identified the need to continue development without losing the existing project requirements and design direction.
- Solution:** I switched to another Bolt account and continued the development process using the new account.
- Verification:** I checked the project in the new account and reviewed the available development progress to ensure I could continue working on LifeOS.

 Challenge 2: Finding Supabase Project Credentials

- **Problem encountered:** While setting up Supabase for LifeOS, I faced difficulty locating the Project URL and Publishable API Key required for connecting the application to the database.
- **Investigation:** I explored the Supabase dashboard and checked the project settings to identify where the required credentials were available.
- **Solution:** I worked through the Supabase project configuration to locate the correct Project URL and Publishable API Key for the application.
- **Verification:** The configuration needs to be tested by checking whether the application can successfully connect to the Supabase project.

challenge 3: Maintaining Secure API Configuration

- Problem encountered:** Integrating external services such as Gemini API and Supabase requires handling API credentials carefully. Exposing secret keys in frontend code or uploading them to GitHub can create security risks.
- Investigation:** I considered how API credentials should be stored and how environment variables can be used to separate sensitive configuration from application code.
- Solution:** The planned approach is to store sensitive credentials in environment variables and configure them through the deployment platform rather than hardcoding secret keys in the source code.
- Verification:** Before considering this challenge resolved, I need to verify that the application can access the required services without exposing secret keys in the frontend or public GitHub repository.

 These challenges helped me understand the importance of managing development environments, configuring backend services, and handling API credentials securely. They also highlighted the importance of testing each integration before considering a feature complete.
7. Importance, applications, and benefits
LifeOS addresses the practical problem of keeping track of personal
administrative responsibilities. By connecting documents to confirmed
actions and deadlines, it can help users:
- Reduce manual document organization.
- Find important information more easily.
- Track tasks originating from documents.
- Prepare for deadlines and renewals.
- Understand task dependencies.
- Follow up on unfinished requests.
- Keep personal administration in one organized workflow.
The application is intended to support user decisions, not automatically
make payments, submit forms, or send messages without approval.

