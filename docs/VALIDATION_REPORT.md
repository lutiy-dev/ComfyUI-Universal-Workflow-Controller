# Validation Report — 0.1.1-lab

Date: 2026-10-02

## Status

- GENERATED: PASS
- VALIDATED: PASS
- REAL NODES 2.0 RUNTIME: PARTIAL — install/render/basic bind passed; first runtime test exposed a binding UX/reliability issue
- FIX FOR RUNTIME ISSUE: IMPLEMENTED + CI VALIDATED
- RETEST OF 0.1.1 ON REAL TARGET: REQUIRED
- STABLE: NO (LAB)

## Runtime finding that triggered 0.1.1

The first real Nodes 2.0 test confirmed:
- package installation: PASS;
- both frontend-only nodes discoverable: PASS;
- Stage Controller rendered in Nodes 2.0: PASS;
- basic Bind Selected: PASS;
- duplicate/overlap diagnostic: PASS.

The same test also showed that a stale or ambiguous canvas selection could produce an unintended duplicate binding, making row-to-target mapping unclear.

0.1.1 hardens this path:
- controller-local click-time selection snapshot;
- empty selection overwrites the snapshot so old selections cannot be reused;
- same-controller duplicate binding is blocked before mutation;
- actual target mode is displayed as ON / MUTED / BYPASSED / MIXED;
- bound target names are displayed;
- Select Bound lets the user visually verify a row's targets.

## GitHub Actions validation

Latest implementation/docs commit:
`76ba15b6736846666fcb9f0dd06952bc63797ff6`

Validation run:
`36988885783`

Result: **SUCCESS**

Environment:
- GitHub-hosted Ubuntu runner
- Node.js 22
- Python 3.12

Validation steps:
- `npm run check` — PASS
- `npm test` — PASS

Automated test result:
- tests: 23
- pass: 23
- fail: 0
- skipped: 0
- cancelled: 0

## Automated coverage

Coverage includes pure controller logic and a mocked current-frontend adapter:
- configuration normalization;
- binding/rebinding/deduplication;
- stale-selection rejection;
- same-controller duplicate-binding rejection;
- Select Bound exact selection;
- MUTE / BYPASS;
- missing-target safety;
- SOLO / repeated SOLO / exact RESTORE;
- Exclusive A/B/C;
- overlap detection and deterministic explicit-action precedence;
- configuration JSON round-trip;
- multiple-controller isolation for non-overlapping targets;
- frontend custom-node registration/render path;
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

Retest 0.1.1 on the user's current ComfyUI / current frontend / Nodes 2.0 before marking TESTED.

## Known LAB limitations

- SOLO restore snapshot is intentionally in-memory only. If a workflow is reloaded while SOLO is active, current node modes persist normally but the pre-SOLO Restore snapshot is not available.
- v0.1.1 binds targets in the controller's current graph. A selected subgraph container can be controlled as a shallow target; deep cross-graph binding to nodes inside another subgraph is not claimed.
- Automatic Queue/Run is intentionally deferred until base control behavior passes real runtime acceptance.
- Cross-controller overlapping bindings are warned; no ownership layer is invented.
