# ComfyUI Universal Workflow Controller

<p align="center">
  <img src="docs/assets/uwc-banner.svg" alt="ComfyUI Universal Workflow Controller" width="100%" />
</p>

**Status:** LAB / TESTED on real current ComfyUI Nodes 2.0. Core Stage Controller, Exclusive Switch, persistence, tab switching, missing-target handling, and Clean Missing passed runtime acceptance. Subgraph-container support is not yet part of the stable claim.

Universal, model-agnostic control nodes for ComfyUI workflows.

The package is designed for current **ComfyUI / ComfyUI Frontend / Nodes 2.0** and intentionally knows nothing about any model, renderer, workflow domain, or project. Users create entries, name them, bind selected nodes/subgraph container nodes, and control execution modes centrally.

## Included nodes

### Universal Stage Controller

A configurable list of independent stages.

Per stage:
- custom name;
- `Bind Selected` / rebind;
- ON/OFF toggle;
- OFF mode: `MUTE` (`NEVER`) or `BYPASS`;
- `SOLO`;
- exact in-session `RESTORE`;
- reorder;
- clear binding;
- remove entry;
- bound target names, target count, actual runtime state, and broken-binding status;
- `Select` to visually reselect bound targets.

Controller actions:
- `+ Stage`;
- `All On`;
- `All Off`;
- `Restore`;
- `Clean Missing`.

### Universal Exclusive Switch

A configurable list of mutually exclusive options.

Selecting one option:
- activates all targets bound to that option;
- disables all other registered options using each option's configured `MUTE` or `BYPASS` mode.

## Binding model

1. Select one or more target nodes on the canvas.
2. Click `Bind Selected` on the desired controller entry.
3. The controller stores workflow-local node IDs.

Binding is intentionally **not** based on:
- model type;
- node title;
- group color;
- node coordinates;
- external files or machine paths.

A selected Nodes 2.0 subgraph container is treated as a single shallow target. Muting/bypassing it changes the container mode, matching current ComfyUI selection-mode behavior. Cross-graph binding to nodes *inside* another subgraph is not claimed in this LAB release.

## Safety / scope

The package:
- does not download models;
- has no network calls;
- has no telemetry;
- has no API keys;
- has no third-party Python dependencies;
- does not rewrite workflow topology;
- changes only the `mode` of explicitly bound target nodes;
- does not automatically Queue/Run workflows.

Multiple controllers may coexist. Same-controller duplicate bindings are blocked before mutation. Cross-controller overlaps are detected and shown as warnings; no ownership is invented.

## Installation

See [START_HERE.md](START_HERE.md).

## Current validation status

Automated validation includes **23 passing tests**: pure core logic plus a mocked current-frontend adapter harness. Coverage includes:
- binding deduplication;
- missing targets;
- ON/OFF;
- MUTE;
- BYPASS;
- SOLO;
- repeated SOLO;
- exact RESTORE;
- Exclusive A/B/C behavior;
- deterministic selected-entry precedence on overlap;
- configuration JSON round-trip;
- multi-controller isolation for non-overlapping bindings.

The frontend adapter mock also verifies custom-node registration/rendering, Bind Selected, Stage SOLO/Restore persistence, Exclusive switching, Clean Missing cancellation safety, and cross-controller overlap diagnostics.

Static validation covers JavaScript syntax and Python shim compilation.

**Real ComfyUI Nodes 2.0 runtime acceptance: PASS for the tested core matrix.** Subgraph-container support remains outside the stable claim until its dedicated runtime test is completed.

## Repository state

Primary source of truth: `main`

Current tested package: `v0.1.1`

## Developer

**OVizLAB** · GitHub: [@lutiy-dev](https://github.com/lutiy-dev)

Registry metadata is prepared for publisher ID `ovizlab`. The publisher account must be created/confirmed in Comfy Registry before the first publish.

## Comfy Registry publishing

Registry metadata is prepared for publisher ID `ovizlab`.

Publishing is intentionally **manual-only**:
1. Create/confirm publisher `ovizlab` on Comfy Registry.
2. Create a Registry API key.
3. Add it to this repository as the Actions secret `REGISTRY_ACCESS_TOKEN`.
4. Run **Actions → Publish to Comfy Registry → Run workflow**.
5. The workflow runs static checks, automated tests and `comfy node validate` before publishing.

Do not commit Registry keys to the repository.

## License

Released under the **MIT License**. See [LICENSE](LICENSE).
