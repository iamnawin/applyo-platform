# Project Memory: Aplio Development Log

This document tracks the state of the Aplio project, detailing changes made and outlining future development directions.

## Previous State (Before current development session)

Aplio was a web application built with Next.js and TypeScript, utilizing Supabase for its database and authentication. It served as a platform for job seekers and companies, offering basic resume upload and job matching functionalities. An initial automated application engine with a generic Playwright script was in place, and the UI had recently undergone a redesign to a dark-themed "glassmorphism" aesthetic.

## Changes Made So Far (During this development session)

The following features and modifications have been implemented:

### 1. Automated Application Engine & UI Redesign (Initial Commit)
-   **Description:** Introduced a new automation engine using Playwright and performed a major UI overhaul.
-   **Key Changes:**
    -   Implemented a core Playwright script (`playwright-apply.ts`) for navigating to job pages and filling basic fields.
    -   Built an orchestration service (`lib/automation/router.ts`) to manage the automation lifecycle.
    -   Created a database migration (`supabase/migrations/004_automation_tracking.sql`) to track automation status and logs for applications.
    -   Integrated the engine with the `approval-service` to trigger on candidate approval.
    -   Redesigned the entire application with a modern, dark-themed "glassmorphism" aesthetic, updating base styles, color palettes, and core UI components (`button`, `card`, `input`).

### 2. Greenhouse Job Scraping and Routing
-   **Description:** Implemented the ability to scrape job postings from specific Greenhouse job boards and integrated this into the application's routing.
-   **Key Changes:**
    -   Created `lib/automation/platforms/greenhouse-scraper.ts` with a `scrapeGreenhouseBoard` function to extract job details from Greenhouse boards.
    -   Modified `lib/automation/router.ts` to detect Greenhouse URLs and route application requests to a dedicated `greenhouse-apply.ts` driver.
    -   Implemented basic Greenhouse application logic in `lib/automation/platforms/greenhouse-apply.ts`.
    -   Created an API endpoint `app/api/jobs/scrape/route.ts` to trigger Greenhouse job board scraping on demand.

### 3. Candidate Resume Profile Editing and Job Scraping API
-   **Description:** Enabled candidates to view and edit their parsed resume data through a dedicated UI and API.
-   **Key Changes:**
    -   Created `components/candidate/ResumeProfileForm.tsx` for candidates to review and edit their parsed resume data.
    -   Added `updateResumeParsedData` and `getLatestResumeByCandidateId` functions to `lib/db/resumes.ts` for database operations.
    -   Implemented API endpoint `app/api/candidate/[candidateId]/resume-profile/route.ts` for fetching and updating resume profiles.
    -   Integrated a new "Edit Resume Profile" tab into `app/dashboard/candidate/CandidateDashboardClient.tsx` to display the `ResumeProfileForm`.

### 4. Dynamic Application Content Generation
-   **Description:** Introduced AI-powered generation of tailored application content.
-   **Key Changes:**
    -   Created `lib/ai/generate-application-content.ts` with a `generateApplicationContent` function to produce cover letters or answers to application questions based on candidate and job data.

### 5. Store and Display Match Reasons
-   **Description:** Enhanced the application matching process to store and display the specific reasons why a job is a good fit for a candidate.
-   **Key Changes:**
    -   Added `match_reasons: string[] | null` to the `Application` interface in `lib/types/index.ts`.
    -   Created a database migration `supabase/migrations/005_add_match_reasons_to_applications.sql` to add the `match_reasons` column to the `applications` table.
    -   Modified `lib/services/match-service.ts` to store AI-generated `match_reasons` when creating new applications.
    -   Updated `lib/db/applications.ts` to accept `match_reasons` in the `upsertApplication` function.
    -   Updated `components/candidate/ApprovalQueueCard.tsx` to display these `match_reasons` to the user.

### 6. Integrate Dynamic Content Generation into Application Workflow
-   **Description:** Seamlessly integrated the AI-generated content into the application approval and submission process.
-   **Key Changes:**
    -   Modified `components/candidate/ApprovalQueueCard.tsx` to include a "Generate Cover Letter" button, allowing candidates to preview AI-generated content.
    -   Updated `ApprovalQueueCard.tsx` to send the `generated_cover_letter` along with the approval action.
    -   Modified `app/api/approvals/route.ts` to accept the `generated_cover_letter` and pass it to the automation trigger.
    -   Enhanced `lib/automation/index.ts` (`triggerApply`) and `lib/automation/router.ts` (`routeApply`) to accept and forward the `generatedCoverLetter`.
    -   Modified platform-specific drivers (`lib/automation/platforms/greenhouse-apply.ts` and `lib/automation/platforms/playwright-apply.ts`) to utilize the `generatedCoverLetter` for filling cover letter fields during automated application.

### 7. AI-Driven Form Interaction
-   **Description:** Enhanced the generic Playwright automation script with a suite of AI-powered tools to intelligently interact with complex and non-standard application forms.
-   **Key Changes:**
    -   Created `lib/ai/infer-field-purpose.ts` to deduce the intended purpose of text inputs (e.g., 'name', 'email').
    -   Created `lib/ai/find-submit-button.ts` to locate the final submission button on a form.
    -   Created `lib/ai/select-dropdown-option.ts` to intelligently choose the correct option from a `<select>` dropdown.
    -   Created `lib/ai/select-checkbox-radio.ts` to select the appropriate options from checkbox and radio button groups.
    -   Integrated these AI utilities into `lib/automation/platforms/playwright-apply.ts`, making the generic application script significantly more robust and adaptable to various form layouts.

## Future Things (Next Steps & Vision)

Based on the user's vision, here are potential future development areas:

-   **Enhanced Candidate Profile/Preferences:**
    -   Allow more granular preferences (e.g., desired salary, specific companies to target/avoid, industry preferences, work authorization).
    -   Implement a more guided profile creation/review process.
-   **Advanced Job Discovery:**
    -   Implement job scraping/API integration for *other* major platforms (e.g., LinkedIn, Indeed, Lever, Workday).
    -   Develop a robust system for discovering new job boards dynamically (e.g., using web search, AI-driven discovery).
    -   Implement scheduled tasks or background workers for continuous job discovery.
-   **Advanced Matching Logic:**
    -   Improve AI matching to consider more nuanced factors (e.g., soft skills, cultural fit, specific project experience, career trajectory).
    -   Allow candidates to provide feedback on match quality to refine the AI model.
-   **Dynamic Application Content (Beyond Cover Letters):**
    -   Generate answers for common application questions (e.g., "Why are you interested in this role?").
    -   Tailor resume sections or highlights dynamically based on the job description.
-   **Pre-Application Review/Approval Enhancements:**
    -   Allow candidates to edit the AI-generated content (cover letters, answers) before final approval.
    -   Provide a more interactive "why this is a good match" breakdown with actionable insights.
-   **Post-Application Tracking & Follow-up:**
    -   Implement automated follow-up emails to recruiters/hiring managers.
    -   Develop a system for tracking application status changes (e.g., "Application Viewed," "Interview Scheduled").
    -   Integrate with calendar for interview scheduling.
