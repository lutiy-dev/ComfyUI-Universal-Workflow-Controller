# Universal Workflow Controller — Architecture v0.1 (LAB)

Status: LAB / DESIGN LOCK CANDIDATE  
Target: current ComfyUI frontend / Nodes 2.0  
Scope: model-agnostic, workflow-agnostic control toolkit.

## Product principle

The controller must know nothing about Flux, Qwen, SDXL, Archviz, video, upscale, or any other model/domain.
It only manages user-bound workflow targets.

User workflow:
1. Add a stage/option.
2. Give it any name.
3. Select nodes and/or subgraphs.
4. Bind selection.
5. Choose disable behavior (MUTE/NEVER or BYPASS).
6. Control the registered stage from one compact node.

## Node A — Universal Stage Controller

Dynamic user-defined list of stages.

Per stage:
- custom name
- Bind Selected
- target count
- ON/OFF
- disable mode: MUTE/NEVER or BYPASS
- SOLO
- Rebind
- Clear
- Remove
- reorder

Controller-level:
- Add Stage
- All On
- All Off
- Solo Restore

Rules:
- Only bound targets may be changed.
- No model-specific knowledge.
- Multiple controllers in one workflow must coexist without interfering.
- State must survive workflow save/reload.

## Node B — Universal Exclusive Switch

Dynamic user-defined options.
Exactly one option is active at a time.

Per option:
- custom name
- Bind Selected
- target count
- Rebind / Clear / Remove / reorder

Use cases:
- implementation A / B / C
- model branch A / B
- day / night / golden hour
- conservative / generative / off
- any mutually-exclusive workflow branches

## Target types

v0.1 goal:
- individual nodes
- multiple selected nodes
- subgraph container nodes where supported
- mixed bindings only after explicit validation

No coordinate/group-color based binding as production source of truth.

## State model

Persist in workflow/node properties:
- controller schema version
- user labels
- target locators/IDs
- disable mode
- current state
- order
- solo restore snapshot

Do not store private machine paths, credentials, models, or domain-specific data.

## Safety

v0.1 does NOT:
- run Queue automatically
- change model parameters
- rewrite workflow topology
- silently rebind missing targets
- touch nodes outside registered targets

RUN/Queue behavior is deferred until base switching is proven stable.

## PASS / FAIL — v0.1

Test graph:
- Branch A
- Branch B
- Branch C

PASS requires:
1. Bind Selected works.
2. ON/OFF works.
3. MUTE/NEVER works.
4. BYPASS works only where valid.
5. SOLO works.
6. RESTORE reproduces exact pre-solo state.
7. Save → reload preserves config/state.
8. Workflow-tab switching preserves config/state.
9. Nodes 2.0 rendering is stable.
10. Missing/deleted target fails safely and visibly.
11. Two controllers do not modify each other's unbound targets.

Any failed item keeps the project in LAB.

## Deferred

- RUN / Queue Selected Stage
- presets
- import/export controller configuration
- keyboard shortcuts
- global toolbar control surface
- public API for other extensions
- localization
- Comfy Registry packaging/release

## Development rule

one task → one module → one test → verified result → next module
