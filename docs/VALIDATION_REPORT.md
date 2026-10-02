# Validation Report — 0.1.0-lab

Date: 2026-10-02

## Status

- GENERATED: PASS
- VALIDATED: PASS
- TESTED on real target ComfyUI: NOT YET
- STABLE: NO (LAB)

## GitHub Actions validation

Workflow: `.github/workflows/lab-validate.yml`

Validated commit:
`e7de23f868055519b74dd9281e25e33ea56e95b2`

Push run:
`36983711967`

Result: **SUCCESS**

Environment:
- GitHub-hosted Ubuntu runner
- Node.js 22
- Python 3.12

Validation steps:
- `npm run check` — PASS
- `npm test` — PASS

Automated test result:
- tests: 20
- pass: 20
- fail: 0
- skipped: 0
- cancelled: 0

## Automated coverage

Coverage includes pure controller logic and a mocked current-frontend adapter:
- configuration normalization;
- binding/rebinding/deduplication;
- MUTE / BYPASS;
- missing-target safety;
- SOLO / repeated SOLO / exact RESTORE;
- Exclusive A/B/C;
- overlap detection and deterministic explicit-action precedence;
- configuration JSON round-trip;
- multiple-controller isolation for non-overlapping targets;
- frontend custom-node registration/render path;
- Bind Selected through current-style canvas selection;
- frontend serialization/configure round-trip;
- Clean Missing cancel/confirm safety;
- cross-controller overlap diagnostics.

## Static checks

```bash
npm run check
```

Checks:
- `node --check js/uwc_core.js`;
- `node --check js/universal_workflow_controller.js`;
- `python -m py_compile __init__.py`.

Static safety policy:
- no private Windows paths;
- no API-key literals;
- no model/domain-specific control logic;
- no model downloads;
- no telemetry;
- no runtime network dependency;
- no automatic Queue/Run behavior.

## Runtime validation still required

One real acceptance test on the user's current ComfyUI / current frontend / Nodes 2.0 is required before marking TESTED.
See `START_HERE.md` and `docs/TEST_PLAN.md`.

## Known LAB limitations

- SOLO restore snapshot is intentionally in-memory only. If a workflow is reloaded while SOLO is active, current node modes persist normally but the pre-SOLO Restore snapshot is not available.
- v0.1 binds targets in the controller's current graph. A selected subgraph container can be controlled as a shallow target; deep cross-graph binding to nodes inside another subgraph is not claimed.
- Automatic Queue/Run is intentionally deferred until base control behavior passes real runtime acceptance.
- Overlapping bindings are warned; no ownership layer is invented. Last explicit action determines the final mode for a shared target.
