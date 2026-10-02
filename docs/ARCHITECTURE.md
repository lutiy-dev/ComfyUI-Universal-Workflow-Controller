# Architecture

## Design target

Current ComfyUI frontend / Nodes 2.0, frontend-first.

The package uses:
- ComfyUI frontend `scripts/app.js` access, then `app.registerExtension`;
- `registerCustomNodes`;
- frontend-only `LGraphNode` virtual nodes;
- `addDOMWidget` for a compact DOM-based control surface;
- dynamic minimum-height growth so an arbitrary number of entries is not clipped;
- current node `mode` semantics: `ALWAYS = 0`, `NEVER = 2`, `BYPASS = 4`;
- current canonical canvas selection when available (`canvas.selectedItems`) with a compatibility fallback to `selected_nodes`.

No ComfyUI source file is patched.

## Why frontend-only

The controller changes workflow-editor state, not tensor/model data. A backend execution node would be the wrong abstraction and would make a universal control tool unnecessarily dependent on execution types.

`__init__.py` therefore only exposes `WEB_DIRECTORY` and empty backend node mappings.

## Core / adapter split

`js/uwc_core.js`
- pure model-agnostic state and mode logic;
- no DOM;
- no ComfyUI imports;
- testable with a mock graph.

`js/universal_workflow_controller.js`
- ComfyUI adapter;
- selection capture;
- node registration;
- persistence adapter;
- DOM UI;
- graph dirty/change notifications.

## Binding scope

Bindings store primitive workflow-local node IDs (`number` or `string`).

A controller operates only on targets resolvable in `controller.graph`.

This yields a clear rule:
- parent-graph controller can bind a subgraph *container node*;
- a controller inside a subgraph can bind nodes in that same subgraph;
- cross-graph bindings into another subgraph are not supported in v0.1 LAB.

This deliberately avoids unstable path inference and silent rebinding.

## Selection capture

A potential UX hazard is stale selection reuse when a controller is clicked after the canvas selection changes.

In 0.1.1 the controller captures the current non-controller selection locally on its own DOM `pointerdown`, immediately before the control action. The snapshot is overwritten even when the selection is empty, so an older selection cannot be silently reused.

`Bind Selected` first reads the current selection for the controller's graph and otherwise uses only that click-time controller-local snapshot. After a successful bind the snapshot is cleared.

The DOM panel stops pointer propagation so UI interaction does not intentionally alter canvas selection.

Same-controller duplicate target bindings are blocked before mutation. The user must Clear/Rebind the conflicting row explicitly.

## Mode changes

The package follows current ComfyUI frontend behavior and changes `node.mode` directly, then notifies the graph via `graph.change()` and dirty-canvas notification.

No node parameters or topology are changed.

## SOLO state

SOLO takes an exact in-memory snapshot of the current modes for every registered target in that controller.

- first SOLO creates the snapshot;
- later SOLO selections reuse the original snapshot;
- RESTORE reapplies exact previous modes;
- snapshot is intentionally transient and not persisted through workflow reload.

This avoids serializing stale restoration state. If a workflow is saved while SOLO is active, the current target node modes themselves are saved normally, but the Restore button will not have a pre-SOLO snapshot after reload.

## Exclusive behavior

When selecting option N:
1. all other registered entries are disabled using their configured off-mode;
2. option N is enabled last.

Selected-entry-last gives deterministic behavior when overlap exists, but overlap is still warned and is not recommended for deterministic automation.

## Persistence

Configuration is stored in the controller node's serialized `properties` under:

```text
uwc_controller_v1
```

Stored data:
- schema version;
- kind;
- ordered entries;
- user labels;
- target IDs;
- disable modes;
- active exclusive entry ID.

No machine-specific path or model-specific metadata is stored.

## UI

One DOM widget per controller renders a compact control deck. This avoids custom canvas drawing and uses ComfyUI's DOM-widget mechanism that participates in current widget registration/state handling.

## Deferred

Not included in the base LAB package:
- automatic Queue/Run;
- cross-graph deep bindings;
- preset import/export;
- keyboard shortcuts;
- registry metadata;
- public API for third-party extensions.
