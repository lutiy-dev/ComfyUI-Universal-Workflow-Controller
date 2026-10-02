# Universal Workflow Controller — MASTER SPEC v1.0

Status: LAB / IMPLEMENTATION SPEC
Target: current ComfyUI + current ComfyUI_frontend, Nodes 2.0 first
Repository branch: dev/universal-workflow-controller

## Product goal

Create a polished, model-agnostic, workflow-agnostic controller toolkit for ComfyUI.
The toolkit must not know or infer anything about Flux, Qwen, SDXL, Archviz, video, upscale, or any other domain/model.
Users define their own stages/options, names, bindings, order, and disable behavior.

Primary UX analogy: a configurable Multi/Sub-Object style control block:
add entries → name them → bind selected targets → control them centrally.

## Package scope

Ship two universal frontend controller nodes in one installable custom-node package:

1. Universal Stage Controller
2. Universal Exclusive Switch

No third-party Python runtime dependencies.
Frontend-first architecture.
Minimal Python shim only if needed for ComfyUI package discovery / WEB_DIRECTORY.

## Node 1 — Universal Stage Controller

### Dynamic stages
Users can:
- Add Stage
- Rename stage
- Reorder stages
- Remove stage
- Bind Selected
- Rebind Selected
- Clear Binding

Each stage shows:
- custom user label
- target count
- enabled/disabled state
- disable mode
- binding health indicator

### Stage actions
Per stage:
- ON
- OFF
- SOLO
- RESTORE support through controller-level solo snapshot
- optional navigation/highlight action only if reliable in Nodes 2.0

### Disable behavior
Per stage selectable:
- MUTE / NEVER
- BYPASS

Semantics:
- ON => LiteGraph.ALWAYS
- MUTE => LiteGraph.NEVER
- BYPASS => Comfy bypass mode (numeric mode used by current frontend)

Never guess whether bypass is semantically valid for arbitrary dataflow.
The user chooses the mode.

### Controller actions
- Add Stage
- All On
- All Off
- Restore Solo State
- Clear invalid bindings confirmation
- optional compact/expanded UI mode if implementation remains stable

### SOLO behavior
When SOLO is triggered:
- snapshot current modes of all targets controlled by this controller
- activate selected stage
- disable other registered stages according to each stage's configured disable mode
- do not touch unregistered nodes
- RESTORE must reproduce exact pre-solo target modes

Nested/repeated SOLO behavior must be deterministic:
- first SOLO creates restore snapshot
- subsequent SOLO changes active solo stage but keeps original snapshot
- RESTORE returns to original snapshot and clears solo session

## Node 2 — Universal Exclusive Switch

### Dynamic options
Users can:
- Add Option
- Rename option
- Reorder options
- Remove option
- Bind Selected
- Rebind
- Clear Binding

### Exclusive semantics
Exactly one configured option is active when the switch is in a valid state.
Selecting option N:
- option N targets => ALWAYS
- all other option targets => their configured disable mode

If no options exist, node is inert.
If active option loses all valid targets, show degraded state rather than silently rebinding.

### Per-option disable mode
Each option can choose:
- MUTE / NEVER
- BYPASS

## Binding model

### Supported targets
Priority:
1. individual nodes
2. multi-selection of nodes
3. subgraph container nodes where the current frontend exposes them as graph nodes
4. mixed selections only if validated in the current frontend

### Binding action
Preferred UX:
select nodes/subgraph(s) on canvas → click Bind Selected.

Stored binding must use stable workflow-local locators/IDs available in the serialized workflow.

Do NOT use:
- node coordinates
- node colors
- group rectangle overlap
- model type
- node title text as identity
- machine paths

### Missing target handling
On load and before every control action:
- resolve each stored target
- mark missing/deleted targets visibly
- never silently bind replacement nodes
- valid targets continue to work
- user can Clear/Rebind

## Persistence

All controller configuration must serialize inside the workflow:
- schemaVersion
- controller type/version
- user labels
- ordered stage/option list
- target locators
- disable mode
- current state
- active exclusive option
- solo restore snapshot only if safe to persist; otherwise clear on reload with explicit state

Save → Reload must preserve all normal configuration.

No external config required for workflow behavior.
No absolute/private paths.

## Multi-controller isolation

Multiple controllers may exist in one workflow.

Rule:
A controller may only change explicitly bound targets.

If two controllers bind the same target:
- detect overlap when possible
- show warning state
- do not invent ownership
- last explicit user action may change the target
- documentation must call overlapping bindings unsupported for deterministic automation unless an ownership strategy is implemented

No controller may scan and mutate the whole workflow by default.

## Nodes 2.0 / frontend architecture

Target current ComfyUI frontend APIs and frontend-only node registration.
Use public/current extension hooks where practical:
- app.registerExtension
- registerCustomNodes
- lifecycle hooks for graph load / node creation as needed
- current LiteGraph node mode semantics
- current Nodes 2.0 / Vue node definition integration where required

Avoid patching internal ComfyUI source files.
Avoid monkey-patching broad global behavior unless no supported API exists and the patch is isolated, documented, and tested.

## UI / visual design

Goal: look like a native, compact production tool.

Requirements:
- compact but readable
- clear hierarchy
- consistent spacing
- no model/domain-specific labels
- state visible at a glance
- target count visible
- invalid/missing bindings visible
- muted/bypassed/active visually distinct
- controls remain usable when node resized
- no oversized decorative UI
- dark-theme friendly
- labels editable by user

UI must remain functional under Nodes 2.0 renderer.

## Queue / RUN

Not part of base v1.0 runtime behavior unless all foundation tests pass with no unresolved regressions.

If added in a later phase:
- RUN must never silently rewrite persistent user state
- queue action must be explicit
- temporary execution state must restore deterministically

Base package release must not depend on RUN.

## Security / portability

Must contain:
- no credentials
- no API keys
- no private paths
- no model downloads
- no telemetry
- no network dependency
- no client/project data

## Compatibility

Primary:
- latest ComfyUI / latest ComfyUI_frontend available during implementation
- Nodes 2.0

Best effort:
- legacy renderer only if support does not compromise Nodes 2.0 implementation

No promise of compatibility with every third-party node that overrides LiteGraph mode semantics.

## Test matrix

### A. Pure logic tests
Automated/mocked:
- add/remove/reorder entries
- rename
- bind target IDs
- rebind
- clear
- resolve valid/missing IDs
- ON
- MUTE
- BYPASS
- SOLO
- repeated SOLO
- RESTORE
- Exclusive A/B/C
- invalid target
- empty controller
- duplicate target inside same entry
- overlapping targets between entries
- serialization/deserialization
- schema migration guard

### B. Mock graph integration tests
Create a mock LiteGraph-like graph:
- nodes with IDs and modes
- deleted nodes
- mixed initial modes
- multiple controllers

Verify exact node modes after every action.

### C. Static validation
- JavaScript syntax/import validation
- package structure validation
- Python shim import/compile if present
- no absolute paths
- no secrets
- no model/domain names in controller logic
- no destructive repository scripts
- README install commands match package layout

### D. Manual runtime acceptance test — final user test
One final install on real current ComfyUI.

Test workflow:
- Branch A
- Branch B
- Branch C
- optional one Subgraph branch

PASS checklist:
1. nodes appear in add-node search
2. Nodes 2.0 renders both nodes correctly
3. Bind Selected works
4. rename works
5. reorder works
6. ON/OFF works
7. MUTE/NEVER works
8. BYPASS works
9. SOLO works
10. repeated SOLO works
11. RESTORE exact
12. Exclusive A/B/C exact
13. Save → Reload exact
14. switch workflow tabs → state remains valid
15. delete bound target → safe visible degraded state
16. Rebind repairs binding
17. two controllers remain isolated
18. subgraph binding works if claimed supported
19. queue executes only nodes allowed by graph/mode state
20. no console errors attributable to package

## PASS / FAIL policy

GENERATED:
code/package created.

VALIDATED:
static tests + automated mocked tests pass.

TESTED:
only after real ComfyUI runtime test on user's current install.

Until runtime test:
status remains LAB / VALIDATED, not STABLE.

Any failure in foundational switching/persistence keeps release in LAB.

## Deliverables — one package

Final handoff should contain:
- installable repository/package
- __init__.py if needed
- web/js controller implementation
- styles/assets if needed
- README.md
- START_HERE.md
- CHANGELOG.md
- LICENSE decision/document
- docs/ARCHITECTURE.md
- docs/TEST_PLAN.md
- tests/
- one minimal test workflow JSON if validly generated against current ComfyUI serialization
- installation instructions for Portable/Desktop
- uninstall instructions
- PASS/FAIL checklist
- known limitations
- exact commit SHA / branch or release tag

## Repository workflow

Development branch:
dev/universal-workflow-controller

Legacy AI-render source is preserved at:
archive/ai-render-legacy-2026-10-02

Do not overwrite/delete the archive branch.

## Definition of Done

A single development pass is complete only when:
- both universal nodes are implemented
- internal logic is model-agnostic
- current Nodes 2.0 frontend APIs are used appropriately
- automated/mock tests pass
- static validation passes
- package is installable
- docs are complete
- limitations are explicit
- one final real-runtime test package is ready for the user

Runtime success on the user's machine is still required before calling the package STABLE.
