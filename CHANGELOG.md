# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Automated Application Engine:**
  - Created a database migration to track automation status and logs for applications.
  - Implemented a core Playwright script (`playwright-apply.ts`) for navigating to job pages and filling basic fields.
  - Built an orchestration service (`lib/automation`) to manage the automation lifecycle.
  - Integrated the engine with the `approval-service` to trigger on candidate approval.
- **Changelog:** Created this `CHANGELOG.md` file to track project changes.
- **Playwright Script Enhancements:**
  - Implemented resume file uploads by downloading from storage and attaching to file inputs.
  - Added logic to fill `textarea` elements (e.g., for cover letters) using the candidate's resume summary.
