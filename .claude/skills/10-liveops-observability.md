---
skill: liveops-observability
description: Use for monitoring, incident response, metrics, alerting, and operational runbooks.
use_when:
  - preparing_go_live
  - adding_monitoring
  - triaging_failures
outputs:
  - runbooks
  - alert_rules
  - metrics_map
---

# Skill — LiveOps and Observability

## Watch These Signals

```yaml
signals:
  - resume_parse_success_rate
  - match_generation_latency
  - approval_to_apply_conversion
  - bot_success_rate
  - rate_limit_frequency
  - hr_candidate_view_volume
  - admin_error_trends
```

## Minimum Runbooks

```yaml
minimum_runbooks:
  - parse_pipeline_failure
  - embedding_generation_failure
  - bot_selector_breakage
  - webhook_signature_failure
  - high_error_rate_after_release
```
