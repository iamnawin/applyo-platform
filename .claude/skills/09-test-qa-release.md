---
skill: test-qa-release
description: Use for test planning, regression coverage, smoke tests, and release readiness.
use_when:
  - adding_new_logic
  - preparing_release
  - validating_bug_fixes
outputs:
  - test_cases
  - regression_notes
  - release_checklist
---

# Skill — Test, QA, and Release

## Testing Pyramid

```yaml
testing_pyramid:
  unit:
    - parsers
    - score_calculators
    - validators
  integration:
    - api_to_db
    - edge_function_to_db
    - approval_to_apply_flow
  end_to_end:
    - candidate_onboarding
    - match_review
    - approve_and_apply
```

## Release Gates

```yaml
release_gates:
  - critical_paths_smoke_tested
  - auth_and_rls_verified
  - parse_and_match_quality_checked
  - automation_failure_handling_checked
  - rollback_path_documented
```
