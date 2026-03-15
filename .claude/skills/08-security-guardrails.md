---
skill: security-guardrails
description: Use for auth, authorization, RLS, secrets, abuse prevention, and audit design.
use_when:
  - touching_auth
  - exposing_new_api_routes
  - handling_sensitive_data
outputs:
  - security_review_notes
  - threat_checks
  - policy_updates
---

# Skill — Security Guardrails

## First Questions

```yaml
first_questions:
  - can_the_client_trigger_this_directly
  - what_stops_cross_tenant_access
  - where_is_the_secret_stored
  - what_is_logged
  - what_needs_auditability
```

## Core Policies

```yaml
core_policies:
  - least_privilege
  - tenant_isolation
  - structured_input_validation
  - signed_webhooks_or_secret_headers
  - safe_error_messages
```
