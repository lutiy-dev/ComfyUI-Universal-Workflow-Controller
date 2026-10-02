# Validation Report — 0.1.0-lab

Date: 2026-10-02

## Status

- GENERATED: PASS
- VALIDATED: PASS
- TESTED on real target ComfyUI: NOT YET
- STABLE: NO (LAB)

## Automated validation

Command:

```bash
npm test
```

Result: **20 / 20 tests PASS**.

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

Static command:

```bash
npm run check
```

Result: PASS.

Checks:
- `node --check js/uwc_core.js`;
- `node --check js/universal_workflow_controller.js`;
- `python -m py_compile __init__.py`.

Static safety scan: PASS. Runtime/test implementation contains no private Windows paths, API-key literals, model/domain-specific logic, model downloads, telemetry, or network calls.

## Runtime validation still required

A single real acceptance test on the user's latest ComfyUI / latest frontend / Nodes 2.0 is required before marking TESTED. See `START_HERE.md` and `docs/TEST_PLAN.md`.

## Known LAB limitations

- SOLO restore snapshot is intentionally in-memory only. If a workflow is reloaded while SOLO is active, current node modes persist normally but the pre-SOLO Restore snapshot is not available.
- v0.1 binds targets in the controller's current graph. A selected subgraph container can be controlled as a shallow target; deep cross-graph binding to nodes inside another subgraph is not claimed.
- Automatic Queue/Run is intentionally deferred until base control behavior passes real runtime acceptance.
- Overlapping bindings are warned; no ownership layer is invented. Last explicit action determines the final mode for a shared target.
