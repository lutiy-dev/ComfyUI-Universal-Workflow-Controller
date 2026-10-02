# Test Plan

## Status vocabulary

- GENERATED — package/code exists.
- VALIDATED — static and automated/mock tests pass.
- TESTED — real target ComfyUI runtime acceptance test passes.
- STABLE — only after repeated real workflow use without unresolved critical failures.

## Automated tests

Run:

```bash
npm test
npm run check
```

Expected:
- all Node test cases PASS;
- both JavaScript modules pass syntax check;
- Python shim compiles.

## Automated coverage

Current tests cover:
- target ID sanitization and deduplication;
- malformed configuration normalization;
- rebind semantics;
- health states;
- ON/OFF;
- MUTE;
- BYPASS;
- missing target safety;
- All Off with mixed off-modes;
- SOLO;
- repeated SOLO;
- exact Restore;
- Exclusive selection;
- overlap precedence;
- overlap detection;
- reorder;
- JSON configuration round-trip;
- isolation for non-overlapping controllers.

## Static policy checks

Before handoff:
- no absolute drive paths;
- no credentials/tokens;
- no network code;
- no model downloads;
- no model/domain-specific behavior;
- no automatic Queue/Run;
- no repository-destructive runtime code.

## Real runtime acceptance

Required on the user's latest ComfyUI / latest frontend with Nodes 2.0 enabled.

Critical PASS list:
1. both nodes are discoverable;
2. both render correctly in Nodes 2.0;
3. Bind Selected targets exactly selected shallow nodes/subgraph containers;
4. rename persists;
5. reorder persists;
6. MUTE works;
7. BYPASS works;
8. SOLO works;
9. repeated SOLO keeps original snapshot;
10. Restore is exact;
11. Exclusive A/B/C is exact;
12. Save/reload preserves configuration;
13. workflow-tab switching preserves configuration and target modes;
14. deleted target degrades visibly/safely;
15. Clean Missing removes stale references only;
16. multiple controllers stay isolated when bindings do not overlap;
17. overlap warning appears when appropriate;
18. selected subgraph container can be controlled if claimed in UI;
19. queue behavior reflects target modes;
20. no package-caused console errors.

## STOP conditions

Any of these is immediate FAIL:
- wrong target mutation;
- mutation of unbound nodes;
- corrupted workflow serialization;
- unrecoverable frontend exception loop;
- exact Restore failure;
- controller disappears/breaks after reload.
