import { app } from "../../../scripts/app.js";
import {
  DISABLE_MODES,
  cloneJson,
  makeConfig,
  makeEntry,
  normalizeConfig,
  entryHealth,
  findOverlaps,
  replaceTargets,
  moveEntry,
  toggleEntry,
  setAllEntries,
  applySolo,
  restoreSnapshot,
  applyExclusive,
} from "./uwc_core.js";

const EXTENSION_NAME = "UniversalWorkflowController";
const CATEGORY = "utils/Universal Workflow Controller";
const CONFIG_KEY = "uwc_controller_v1";
const MARKER = "__uwcControllerV1";
const PANEL_WIDGET_NAME = "uwc_panel_v1";
const CONTROLLERS = new Set();
const SELECTION_MEMORY = new WeakMap();
let globalHooksInstalled = false;
let healthTimer = null;

function injectStyles() {
  if (document.getElementById("uwc-controller-style-v1")) return;
  const style = document.createElement("style");
  style.id = "uwc-controller-style-v1";
  style.textContent = `
    .uwc-root { box-sizing:border-box; width:100%; padding:4px 2px 7px; color:var(--fg-color,#ddd); font:12px/1.25 Inter,system-ui,sans-serif; user-select:none; }
    .uwc-root * { box-sizing:border-box; }
    .uwc-toolbar { display:flex; gap:5px; flex-wrap:wrap; margin-bottom:6px; }
    .uwc-btn, .uwc-select, .uwc-input { border:1px solid rgba(150,150,150,.34); border-radius:6px; background:rgba(40,40,40,.72); color:inherit; min-height:26px; }
    .uwc-btn { padding:3px 8px; cursor:pointer; white-space:nowrap; }
    .uwc-btn:hover { background:rgba(76,76,76,.86); }
    .uwc-btn:disabled { opacity:.4; cursor:default; }
    .uwc-btn-primary { border-color:rgba(94,168,255,.7); }
    .uwc-btn-danger { border-color:rgba(230,100,100,.5); }
    .uwc-entry { border:1px solid rgba(150,150,150,.22); background:rgba(20,20,20,.26); border-radius:8px; padding:6px; margin:5px 0; }
    .uwc-entry-main { display:grid; grid-template-columns:auto minmax(110px,1fr) 80px; gap:5px; align-items:center; }
    .uwc-entry-actions { display:flex; gap:4px; align-items:center; margin-top:5px; flex-wrap:wrap; }
    .uwc-input { width:100%; padding:3px 7px; user-select:text; }
    .uwc-select { padding:2px 5px; }
    .uwc-state { font-weight:700; min-width:64px; }
    .uwc-on { border-color:rgba(83,190,112,.8); color:#9ee7ae; }
    .uwc-off { border-color:rgba(140,140,140,.5); color:#bbb; }
    .uwc-mixed { border-color:rgba(230,185,72,.75); color:#f2cf70; }
    .uwc-broken { border-color:rgba(232,91,91,.8); color:#ff9d9d; }
    .uwc-active { outline:1px solid rgba(94,168,255,.85); }
    .uwc-spacer { flex:1; }
    .uwc-meta { opacity:.72; font-size:11px; }
    .uwc-warning { margin:4px 0 6px; padding:5px 7px; border-radius:6px; background:rgba(183,124,31,.18); border:1px solid rgba(220,161,58,.45); color:#f2cf70; }
    .uwc-error { background:rgba(180,55,55,.18); border-color:rgba(225,92,92,.5); color:#ffaaaa; }
    .uwc-notice { margin:4px 0 6px; padding:5px 7px; border-radius:6px; background:rgba(70,126,190,.16); border:1px solid rgba(94,168,255,.4); }
    .uwc-empty { opacity:.7; padding:12px 6px; text-align:center; border:1px dashed rgba(150,150,150,.25); border-radius:7px; }
    .uwc-radio { width:16px; height:16px; accent-color:#5ea8ff; cursor:pointer; }
  `;
  document.head.appendChild(style);
}

function isControllerNode(node) {
  return !!node?.[MARKER];
}

function looksLikeNode(item) {
  return item && (typeof item.id === "number" || typeof item.id === "string") && "mode" in item;
}

function currentSelectedNodes() {
  const canvas = app?.canvas;
  if (!canvas) return [];

  let items = [];
  if (canvas.selectedItems && typeof canvas.selectedItems[Symbol.iterator] === "function") {
    items = [...canvas.selectedItems];
  } else if (canvas.selected_nodes && typeof canvas.selected_nodes === "object") {
    items = Object.values(canvas.selected_nodes);
  }

  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (!looksLikeNode(item) || isControllerNode(item)) continue;
    const key = `${typeof item.id}:${String(item.id)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function rememberSelection() {
  const nodes = currentSelectedNodes();
  if (!nodes.length) return;
  const byGraph = new Map();
  for (const node of nodes) {
    const graph = node.graph;
    if (!graph) continue;
    if (!byGraph.has(graph)) byGraph.set(graph, []);
    byGraph.get(graph).push(node.id);
  }
  for (const [graph, ids] of byGraph) SELECTION_MEMORY.set(graph, ids);
}

function selectedIdsForController(controller) {
  const graph = controller.graph;
  if (!graph) return [];
  const current = currentSelectedNodes().filter((n) => n.graph === graph && n !== controller);
  if (current.length) return current.map((n) => n.id);

  const remembered = SELECTION_MEMORY.get(graph) ?? [];
  return remembered.filter((id) => !!graph.getNodeById?.(id));
}

function installGlobalHooks() {
  if (globalHooksInstalled) return;
  globalHooksInstalled = true;

  // Capture the selection BEFORE a click inside a controller can affect canvas selection.
  document.addEventListener("pointerdown", rememberSelection, true);
  document.addEventListener("keydown", rememberSelection, true);

  healthTimer = window.setInterval(() => {
    for (const controller of [...CONTROLLERS]) {
      try { controller.refreshHealth?.(); } catch (error) { console.warn("[UWC] health refresh failed", error); }
    }
  }, 800);

  window.addEventListener("beforeunload", () => {
    if (healthTimer) window.clearInterval(healthTimer);
  }, { once: true });
}

function button(label, className = "") {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `uwc-btn ${className}`.trim();
  el.textContent = label;
  return el;
}

function modeSelect(value) {
  const el = document.createElement("select");
  el.className = "uwc-select";
  for (const v of [DISABLE_MODES.MUTE, DISABLE_MODES.BYPASS]) {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    el.appendChild(opt);
  }
  el.value = value;
  return el;
}

function stateClass(state) {
  if (state.includes("BROKEN")) return "uwc-broken";
  if (state.includes("MIXED")) return "uwc-mixed";
  if (state.includes("ON")) return "uwc-on";
  return "uwc-off";
}

class UWCBaseNode extends (globalThis.LGraphNode ?? globalThis.LiteGraph?.LGraphNode ?? class {}) {
  constructor(title, kind) {
    super(title);
    this[MARKER] = true;
    this.isVirtualNode = true;
    this.serialize_widgets = false;
    this._kind = kind;
    this._notice = null;
    this._noticeTimer = null;
    this._lastHealthSignature = "";

    this.properties ??= {};
    this._config = normalizeConfig(this.properties[CONFIG_KEY] ?? makeConfig(kind), kind);
    this.properties[CONFIG_KEY] = cloneJson(this._config);

    this._root = document.createElement("div");
    this._root.className = "uwc-root";
    this._root.addEventListener("pointerdown", (event) => event.stopPropagation());
    this._root.addEventListener("dblclick", (event) => event.stopPropagation());
    this._root.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });

    this.widgets ??= [];
    if (typeof this.addDOMWidget === "function") {
      this._panelWidget = this.addDOMWidget(PANEL_WIDGET_NAME, "UWC_PANEL", this._root, {
        serialize: false,
        hideOnZoom: false,
        margin: 5,
        getMinHeight: () => this.estimatedHeight(),
        getHeight: () => this.estimatedHeight(),
      });
    } else {
      // Should not occur on supported current ComfyUI; explicit fallback keeps failure visible.
      this.addWidget?.("button", "UWC requires current ComfyUI", null, () => {});
    }

    this.size = this.size ?? [470, 160];
    try { this.setSize?.([Math.max(this.size[0] ?? 0, 470), Math.max(this.size[1] ?? 0, 160)]); } catch {}
    window.setTimeout(() => this.render(), 0);
  }

  estimatedHeight() {
    const count = this._config?.entries?.length ?? 0;
    return Math.max(120, 62 + count * 78 + (this._notice ? 34 : 0));
  }

  ensurePanelSize() {
    const width = Math.max(this.size?.[0] ?? 0, 470);
    const requiredHeight = this.estimatedHeight() + 36;
    const currentHeight = this.size?.[1] ?? 0;
    if (currentHeight < requiredHeight) {
      try { this.setSize?.([width, requiredHeight]); } catch {}
    }
  }

  onAdded() {
    CONTROLLERS.add(this);
    window.setTimeout(() => this.render(), 0);
  }

  onRemoved() {
    CONTROLLERS.delete(this);
    if (this._noticeTimer) window.clearTimeout(this._noticeTimer);
  }

  onConfigure(info) {
    const raw = info?.properties?.[CONFIG_KEY] ?? this.properties?.[CONFIG_KEY] ?? makeConfig(this._kind);
    this._config = normalizeConfig(raw, this._kind);
    this.properties ??= {};
    this.properties[CONFIG_KEY] = cloneJson(this._config);
    window.setTimeout(() => this.render(), 0);
  }

  onSerialize(data) {
    data.properties ??= {};
    data.properties[CONFIG_KEY] = cloneJson(this._config);
  }

  persist(markChanged = true) {
    this.properties ??= {};
    this.properties[CONFIG_KEY] = cloneJson(this._config);
    if (markChanged) {
      try { this.graph?.change?.(); } catch {}
      try { this.graph?.setDirtyCanvas?.(true, true); } catch {}
    }
  }

  notice(text, isError = false) {
    this._notice = { text, isError };
    if (this._noticeTimer) window.clearTimeout(this._noticeTimer);
    this._noticeTimer = window.setTimeout(() => {
      this._notice = null;
      this.render();
    }, 3200);
    this.render();
  }

  bind(entry) {
    const ids = selectedIdsForController(this);
    if (!ids.length) {
      this.notice("No bindable nodes selected. Select target nodes/subgraph container, then Bind Selected.", true);
      return false;
    }
    replaceTargets(entry, ids);
    this.persist();
    this.notice(`Bound ${ids.length} target${ids.length === 1 ? "" : "s"}.`);
    return true;
  }

  rename(entry, value) {
    const label = String(value ?? "").trim();
    if (!label) return;
    entry.label = label;
    this.persist();
  }

  changeDisableMode(entry, value) {
    entry.disableMode = value === DISABLE_MODES.BYPASS ? DISABLE_MODES.BYPASS : DISABLE_MODES.MUTE;
    this.persist();
    this.render();
  }

  clearBinding(entry) {
    if (!entry.targets.length) return;
    entry.targets = [];
    this.persist();
    this.render();
  }

  removeEntry(entry) {
    if (!window.confirm(`Remove "${entry.label}" from this controller?\nTarget nodes will not be changed.`)) return;
    this._config.entries = this._config.entries.filter((e) => e.id !== entry.id);
    if (this._config.activeId === entry.id) this._config.activeId = null;
    this.persist();
    this.render();
  }

  move(entry, delta) {
    if (moveEntry(this._config.entries, entry.id, delta)) {
      this.persist();
      this.render();
    }
  }

  addEntry(labelPrefix) {
    const entry = makeEntry(`${labelPrefix} ${this._config.entries.length + 1}`);
    this._config.entries.push(entry);
    this.persist();
    this.render();
    return entry;
  }

  clearMissingBindings() {
    if (!this.graph) return;
    const missingCount = this.countMissingBindings();
    if (!missingCount) {
      this.notice("No missing bindings found.");
      return;
    }
    if (!window.confirm(`Remove ${missingCount} missing/deleted target reference${missingCount === 1 ? "" : "s"} from this controller?`)) return;

    // Mutate only after confirmation. Cancelling must leave in-memory workflow state untouched.
    for (const entry of this._config.entries) {
      entry.targets = entry.targets.filter((id) => !!this.graph.getNodeById?.(id));
    }
    this.persist();
    this.notice(`Removed ${missingCount} missing target reference${missingCount === 1 ? "" : "s"}.`);
  }

  countMissingBindings() {
    if (!this.graph) return 0;
    return this._config.entries.reduce((sum, entry) => sum + entryHealth(this.graph, entry).missing, 0);
  }

  crossControllerOverlapCount() {
    if (!this.graph) return 0;
    const mine = new Set();
    for (const entry of this._config.entries) {
      for (const id of entry.targets) mine.add(`${typeof id}:${String(id)}`);
    }
    if (!mine.size) return 0;
    let count = 0;
    const seen = new Set();
    for (const other of CONTROLLERS) {
      if (other === this || other.graph !== this.graph || !other._config) continue;
      for (const entry of other._config.entries ?? []) {
        for (const id of entry.targets ?? []) {
          const key = `${typeof id}:${String(id)}`;
          if (mine.has(key) && !seen.has(key)) { seen.add(key); count += 1; }
        }
      }
    }
    return count;
  }

  commonBanners(root) {
    if (this._notice) {
      const n = document.createElement("div");
      n.className = `uwc-notice ${this._notice.isError ? "uwc-error" : ""}`;
      n.textContent = this._notice.text;
      root.appendChild(n);
    }

    const overlaps = findOverlaps(this._config);
    if (overlaps.length) {
      const w = document.createElement("div");
      w.className = "uwc-warning";
      w.textContent = `${overlaps.length} overlapping target binding${overlaps.length === 1 ? "" : "s"} inside this controller. Explicit last action wins; avoid overlaps for deterministic automation.`;
      root.appendChild(w);
    }

    const cross = this.crossControllerOverlapCount();
    if (cross) {
      const w = document.createElement("div");
      w.className = "uwc-warning";
      w.textContent = `${cross} target${cross === 1 ? "" : "s"} also bound by another controller on this graph. Controllers do not claim ownership; last explicit action wins.`;
      root.appendChild(w);
    }
  }

  refreshHealth() {
    if (!this.graph || !this._config) return;
    const sig = this._config.entries.map((e) => {
      const h = entryHealth(this.graph, e);
      return `${e.id}:${h.state}:${h.valid}:${h.missing}`;
    }).join("|");
    if (sig !== this._lastHealthSignature) {
      this._lastHealthSignature = sig;
      this.render();
    }
  }

  makeLabelInput(entry) {
    const input = document.createElement("input");
    input.className = "uwc-input";
    input.type = "text";
    input.value = entry.label;
    input.spellcheck = false;
    input.title = "Custom label stored in this workflow";
    input.addEventListener("change", () => this.rename(entry, input.value));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") input.blur();
      event.stopPropagation();
    });
    return input;
  }

  makeBindButton(entry, health) {
    const b = button(`Bind Selected · ${health.valid}/${health.total}`, "uwc-btn-primary");
    b.title = "Replace this binding with the currently selected nodes/subgraph container(s).";
    b.addEventListener("click", () => this.bind(entry));
    return b;
  }

  makeUtilityActions(entry, index, includeSolo = false) {
    const frag = document.createDocumentFragment();
    if (includeSolo) {
      const solo = button("SOLO");
      solo.title = "Temporarily isolate this entry. RESTORE returns exact pre-solo modes.";
      solo.addEventListener("click", () => this.soloEntry(entry));
      frag.appendChild(solo);
    }

    const up = button("↑");
    up.title = "Move up";
    up.disabled = index === 0;
    up.addEventListener("click", () => this.move(entry, -1));
    frag.appendChild(up);

    const down = button("↓");
    down.title = "Move down";
    down.disabled = index === this._config.entries.length - 1;
    down.addEventListener("click", () => this.move(entry, 1));
    frag.appendChild(down);

    const clear = button("Clear");
    clear.title = "Clear binding only; target nodes are not modified.";
    clear.disabled = !entry.targets.length;
    clear.addEventListener("click", () => this.clearBinding(entry));
    frag.appendChild(clear);

    const remove = button("×", "uwc-btn-danger");
    remove.title = "Remove entry; target nodes are not modified.";
    remove.addEventListener("click", () => this.removeEntry(entry));
    frag.appendChild(remove);
    return frag;
  }

  render() {}
}

class UniversalStageController extends UWCBaseNode {
  static title = "Universal Stage Controller";
  static category = CATEGORY;

  constructor(title = UniversalStageController.title) {
    super(title, "stage");
    this._soloSnapshot = null;
    this._soloActiveId = null;
  }

  soloEntry(entry) {
    const result = applySolo(this.graph, this._config, entry.id, this._soloSnapshot);
    if (!result.ok) {
      this.notice("Cannot SOLO: this entry has no valid bound targets.", true);
      return;
    }
    this._soloSnapshot = result.snapshot;
    this._soloActiveId = entry.id;
    this.render();
  }

  restoreSolo() {
    if (!this._soloSnapshot?.length) return;
    restoreSnapshot(this.graph, this._soloSnapshot);
    this._soloSnapshot = null;
    this._soloActiveId = null;
    this.render();
  }

  render() {
    if (!this._root) return;
    const root = this._root;
    root.innerHTML = "";

    const toolbar = document.createElement("div");
    toolbar.className = "uwc-toolbar";
    const add = button("+ Stage", "uwc-btn-primary");
    add.addEventListener("click", () => this.addEntry("Stage"));
    const allOn = button("All On");
    allOn.addEventListener("click", () => { setAllEntries(this.graph, this._config, true); this.render(); });
    const allOff = button("All Off");
    allOff.addEventListener("click", () => { setAllEntries(this.graph, this._config, false); this.render(); });
    const restore = button("Restore");
    restore.disabled = !this._soloSnapshot?.length;
    restore.title = "Available only during the current SOLO session. SOLO snapshot intentionally does not persist across reload.";
    restore.addEventListener("click", () => this.restoreSolo());
    const clean = button("Clean Missing");
    clean.disabled = this.countMissingBindings() === 0;
    clean.title = "Remove only stale target references; no target node is modified.";
    clean.addEventListener("click", () => this.clearMissingBindings());
    toolbar.append(add, allOn, allOff, restore, clean);
    root.appendChild(toolbar);

    this.commonBanners(root);

    if (!this._config.entries.length) {
      const empty = document.createElement("div");
      empty.className = "uwc-empty";
      empty.textContent = "Add a stage, select target nodes, then Bind Selected.";
      root.appendChild(empty);
    }

    this._config.entries.forEach((entry, index) => {
      const health = entryHealth(this.graph, entry);
      const card = document.createElement("div");
      card.className = `uwc-entry ${this._soloActiveId === entry.id ? "uwc-active" : ""}`;

      const main = document.createElement("div");
      main.className = "uwc-entry-main";

      const state = button(health.state.replace("PARTIAL_", ""), `uwc-state ${stateClass(health.state)}`);
      state.title = health.missing ? `${health.missing} target(s) are missing/deleted.` : "Toggle this stage ON/OFF.";
      state.disabled = health.valid === 0;
      state.addEventListener("click", () => { toggleEntry(this.graph, entry); this.render(); });

      const label = this.makeLabelInput(entry);
      const mode = modeSelect(entry.disableMode);
      mode.title = "Mode used when this stage is OFF.";
      mode.addEventListener("change", () => this.changeDisableMode(entry, mode.value));
      main.append(state, label, mode);

      const actions = document.createElement("div");
      actions.className = "uwc-entry-actions";
      actions.appendChild(this.makeBindButton(entry, health));
      actions.appendChild(this.makeUtilityActions(entry, index, true));
      const meta = document.createElement("span");
      meta.className = "uwc-meta";
      meta.textContent = health.missing ? `${health.missing} missing` : `${health.valid} target${health.valid === 1 ? "" : "s"}`;
      actions.appendChild(meta);

      card.append(main, actions);
      root.appendChild(card);
    });

    root.style.setProperty("--comfy-widget-min-height", `${this.estimatedHeight()}px`);
    this.ensurePanelSize();
    this._lastHealthSignature = this._config.entries.map((e) => {
      const h = entryHealth(this.graph, e);
      return `${e.id}:${h.state}:${h.valid}:${h.missing}`;
    }).join("|");
    try { this.graph?.setDirtyCanvas?.(true, false); } catch {}
  }
}

class UniversalExclusiveSwitch extends UWCBaseNode {
  static title = "Universal Exclusive Switch";
  static category = CATEGORY;

  constructor(title = UniversalExclusiveSwitch.title) {
    super(title, "exclusive");
  }

  selectEntry(entry) {
    const result = applyExclusive(this.graph, this._config, entry.id);
    if (!result.ok) {
      this.notice("Cannot activate: this option has no valid bound targets.", true);
      return;
    }
    this._config.activeId = entry.id;
    this.persist();
    this.render();
  }

  render() {
    if (!this._root) return;
    const root = this._root;
    root.innerHTML = "";

    const toolbar = document.createElement("div");
    toolbar.className = "uwc-toolbar";
    const add = button("+ Option", "uwc-btn-primary");
    add.addEventListener("click", () => this.addEntry("Option"));
    toolbar.appendChild(add);
    const clean = button("Clean Missing");
    clean.disabled = this.countMissingBindings() === 0;
    clean.title = "Remove only stale target references; no target node is modified.";
    clean.addEventListener("click", () => this.clearMissingBindings());
    toolbar.appendChild(clean);
    const hint = document.createElement("span");
    hint.className = "uwc-meta";
    hint.textContent = "exactly one active by explicit selection";
    toolbar.appendChild(hint);
    root.appendChild(toolbar);

    this.commonBanners(root);

    if (!this._config.entries.length) {
      const empty = document.createElement("div");
      empty.className = "uwc-empty";
      empty.textContent = "Add options, bind targets, then choose the active option.";
      root.appendChild(empty);
    }

    this._config.entries.forEach((entry, index) => {
      const health = entryHealth(this.graph, entry);
      const card = document.createElement("div");
      card.className = `uwc-entry ${this._config.activeId === entry.id ? "uwc-active" : ""}`;

      const main = document.createElement("div");
      main.className = "uwc-entry-main";

      const chooseWrap = document.createElement("label");
      chooseWrap.style.display = "flex";
      chooseWrap.style.alignItems = "center";
      chooseWrap.style.gap = "5px";
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.className = "uwc-radio";
      radio.name = `uwc-exclusive-${String(this.id)}`;
      radio.checked = this._config.activeId === entry.id;
      radio.disabled = health.valid === 0;
      radio.addEventListener("change", () => { if (radio.checked) this.selectEntry(entry); });
      const stateText = document.createElement("span");
      stateText.className = `uwc-meta ${stateClass(health.state)}`;
      stateText.textContent = health.state.replace("PARTIAL_", "");
      chooseWrap.append(radio, stateText);

      const label = this.makeLabelInput(entry);
      const mode = modeSelect(entry.disableMode);
      mode.title = "Mode used for this option when another option is active.";
      mode.addEventListener("change", () => this.changeDisableMode(entry, mode.value));
      main.append(chooseWrap, label, mode);

      const actions = document.createElement("div");
      actions.className = "uwc-entry-actions";
      actions.appendChild(this.makeBindButton(entry, health));
      actions.appendChild(this.makeUtilityActions(entry, index, false));
      const meta = document.createElement("span");
      meta.className = "uwc-meta";
      meta.textContent = health.missing ? `${health.valid}/${health.total} valid · ${health.missing} missing` : `${health.valid} target${health.valid === 1 ? "" : "s"}`;
      actions.appendChild(meta);

      card.append(main, actions);
      root.appendChild(card);
    });

    root.style.setProperty("--comfy-widget-min-height", `${this.estimatedHeight()}px`);
    this.ensurePanelSize();
    this._lastHealthSignature = this._config.entries.map((e) => {
      const h = entryHealth(this.graph, e);
      return `${e.id}:${h.state}:${h.valid}:${h.missing}`;
    }).join("|");
    try { this.graph?.setDirtyCanvas?.(true, false); } catch {}
  }
}

function registerNodeType(type, klass) {
  if (!globalThis.LiteGraph?.registerNodeType) throw new Error("LiteGraph.registerNodeType is unavailable");
  globalThis.LiteGraph.registerNodeType(type, klass);
  klass.category = CATEGORY;
  klass.collapsable = true;
}

app.registerExtension({
  name: EXTENSION_NAME,

  setup() {
    injectStyles();
    installGlobalHooks();
  },

  registerCustomNodes() {
    injectStyles();
    installGlobalHooks();
    registerNodeType("Universal Workflow Controller/Stage Controller", UniversalStageController);
    registerNodeType("Universal Workflow Controller/Exclusive Switch", UniversalExclusiveSwitch);
  },

  loadedGraphNode(node) {
    if (isControllerNode(node) || node?.type?.startsWith?.("Universal Workflow Controller/")) {
      node[MARKER] = true;
      CONTROLLERS.add(node);
      window.setTimeout(() => node.render?.(), 0);
    }
  },
});

console.info("[Universal Workflow Controller] frontend extension loaded");
