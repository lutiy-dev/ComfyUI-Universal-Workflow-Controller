import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

class FakeStyle {
  constructor() { this.values = new Map(); }
  setProperty(k, v) { this.values.set(k, String(v)); }
}

class FakeElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.listeners = new Map();
    this.style = new FakeStyle();
    this.className = '';
    this.textContent = '';
    this.title = '';
    this.type = '';
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.spellcheck = true;
    this.id = '';
    this._innerHTML = '';
  }
  appendChild(child) { this.children.push(child); return child; }
  append(...children) { for (const c of children) this.appendChild(c); }
  addEventListener(type, cb) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(cb);
  }
  dispatchEvent(event) {
    event.target ??= this;
    event.stopPropagation ??= () => {};
    for (const cb of this.listeners.get(event.type) ?? []) cb(event);
    return true;
  }
  blur() {}
  set innerHTML(v) { this._innerHTML = String(v); this.children = []; }
  get innerHTML() { return this._innerHTML; }
}

class FakeDocument {
  constructor() {
    this.head = new FakeElement('head');
    this.listeners = new Map();
    this.byId = new Map();
    const originalAppend = this.head.appendChild.bind(this.head);
    this.head.appendChild = (el) => {
      if (el?.id) this.byId.set(el.id, el);
      return originalAppend(el);
    };
  }
  createElement(tag) { return new FakeElement(tag); }
  createDocumentFragment() { return new FakeElement('#fragment'); }
  getElementById(id) { return this.byId.get(id) ?? null; }
  addEventListener(type, cb) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(cb);
  }
}

let nextNodeId = 1;
class FakeLGraphNode {
  constructor(title = '') {
    this.title = title;
    this.id = nextNodeId++;
    this.mode = 0;
    this.properties = {};
    this.widgets = [];
    this.size = [200, 100];
    this.graph = null;
  }
  addDOMWidget(name, type, element, options = {}) {
    const widget = { name, type, element, options, serialize: options.serialize ?? true };
    this.widgets.push(widget);
    return widget;
  }
  addWidget(type, name, value, callback) {
    const widget = { type, name, value, callback };
    this.widgets.push(widget);
    return widget;
  }
  setSize(size) { this.size = [...size]; }
}

class FakeGraph {
  constructor() {
    this._nodes = [];
    this.changeCount = 0;
    this.dirtyCount = 0;
  }
  add(node) { node.graph = this; this._nodes.push(node); node.onAdded?.(); return node; }
  remove(node) { this._nodes = this._nodes.filter((n) => n !== node); node.onRemoved?.(); node.graph = null; }
  getNodeById(id) { return this._nodes.find((n) => n.id === id) ?? null; }
  change() { this.changeCount += 1; }
  setDirtyCanvas() { this.dirtyCount += 1; }
}

function basicNode(id, mode = 0) {
  const n = new FakeLGraphNode(`N${id}`);
  n.id = id;
  n.mode = mode;
  return n;
}

async function loadFrontendHarness() {
  const dir = await mkdtemp(join(tmpdir(), 'uwc-front-'));
  const here = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const sourcePath = join(here, 'js', 'universal_workflow_controller.js');
  const corePath = join(here, 'js', 'uwc_core.js');
  let src = await readFile(sourcePath, 'utf8');
  src = src.replace('import { app } from "../../../scripts/app.js";', 'const app = globalThis.__UWC_TEST_APP;');
  const transformed = join(dir, 'universal_workflow_controller.js');
  await writeFile(transformed, src, 'utf8');
  await copyFile(corePath, join(dir, 'uwc_core.js'));

  const registered = new Map();
  const extensions = [];
  const document = new FakeDocument();
  const window = {
    setTimeout,
    clearTimeout,
    setInterval(fn, ms) { const id = setInterval(fn, ms); id.unref?.(); return id; },
    clearInterval,
    confirm: () => true,
    addEventListener: () => {},
  };
  const LiteGraph = {
    LGraphNode: FakeLGraphNode,
    registered_node_types: Object.create(null),
    registerNodeType(type, klass) {
      registered.set(type, klass);
      this.registered_node_types[type] = klass;
    },
  };
  const app = {
    canvas: {
      selectedItems: new Set(),
      selected_nodes: {},
      selectItems(items) { this.selectedItems = new Set(items); },
    },
    registerExtension(ext) {
      extensions.push(ext);
      ext.setup?.();
      ext.registerCustomNodes?.();
    },
  };

  globalThis.document = document;
  globalThis.window = window;
  globalThis.LGraphNode = FakeLGraphNode;
  globalThis.LiteGraph = LiteGraph;
  globalThis.__UWC_TEST_APP = app;

  await import(`${pathToFileURL(transformed).href}?t=${Date.now()}`);

  return {
    dir,
    app,
    window,
    registered,
    extensions,
    cleanup: async () => {
      await rm(dir, { recursive: true, force: true });
      delete globalThis.__UWC_TEST_APP;
    },
  };
}

test('frontend adapter registers both virtual controller nodes and renders', async () => {
  const h = await loadFrontendHarness();
  try {
    assert.ok(h.registered.has('Universal Workflow Controller/Stage Controller'));
    assert.ok(h.registered.has('Universal Workflow Controller/Exclusive Switch'));
    const Stage = h.registered.get('Universal Workflow Controller/Stage Controller');
    const Exclusive = h.registered.get('Universal Workflow Controller/Exclusive Switch');
    const s = new Stage();
    const e = new Exclusive();
    assert.equal(s.isVirtualNode, true);
    assert.equal(e.isVirtualNode, true);
    assert.ok(s.widgets.length >= 1);
    assert.ok(e.widgets.length >= 1);
    await new Promise((r) => setTimeout(r, 0));
    assert.ok(s._root.children.length > 0);
    assert.ok(e._root.children.length > 0);
  } finally {
    await h.cleanup();
  }
});

test('frontend binding, stage switching, SOLO/Restore and persistence work on mock graph', async () => {
  const h = await loadFrontendHarness();
  try {
    const Stage = h.registered.get('Universal Workflow Controller/Stage Controller');
    const graph = new FakeGraph();
    const a = graph.add(basicNode(101, 4));
    const b = graph.add(basicNode(102, 2));
    const c = graph.add(basicNode(103, 0));
    const ctl = graph.add(new Stage());

    const ea = ctl.addEntry('Stage');
    const eb = ctl.addEntry('Stage');
    const ec = ctl.addEntry('Stage');
    ea.label = 'A'; eb.label = 'B'; ec.label = 'C';

    h.app.canvas.selectedItems = new Set([a]);
    assert.equal(ctl.bind(ea), true);
    h.app.canvas.selectedItems = new Set([b]);
    assert.equal(ctl.bind(eb), true);
    h.app.canvas.selectedItems = new Set([c]);
    assert.equal(ctl.bind(ec), true);
    assert.deepEqual(ea.targets, [101]);
    assert.deepEqual(eb.targets, [102]);
    assert.deepEqual(ec.targets, [103]);

    ctl.soloEntry(eb);
    assert.deepEqual([a.mode, b.mode, c.mode], [2, 0, 2]);
    ctl.soloEntry(ec);
    assert.deepEqual([a.mode, b.mode, c.mode], [2, 2, 0]);
    ctl.restoreSolo();
    assert.deepEqual([a.mode, b.mode, c.mode], [4, 2, 0]);

    const saved = {};
    ctl.onSerialize(saved);
    const restored = graph.add(new Stage());
    restored.onConfigure(saved);
    assert.deepEqual(restored._config.entries.map((x) => x.label), ['A', 'B', 'C']);
    assert.deepEqual(restored._config.entries.map((x) => x.targets), [[101], [102], [103]]);
  } finally {
    await h.cleanup();
  }
});

test('frontend Exclusive selects exactly one registered branch with per-option off modes', async () => {
  const h = await loadFrontendHarness();
  try {
    const Exclusive = h.registered.get('Universal Workflow Controller/Exclusive Switch');
    const graph = new FakeGraph();
    const a = graph.add(basicNode(201, 0));
    const b = graph.add(basicNode(202, 0));
    const c = graph.add(basicNode(203, 0));
    const ctl = graph.add(new Exclusive());
    const ea = ctl.addEntry('Option'); ea.targets = [201]; ea.disableMode = 'MUTE';
    const eb = ctl.addEntry('Option'); eb.targets = [202]; eb.disableMode = 'BYPASS';
    const ec = ctl.addEntry('Option'); ec.targets = [203]; ec.disableMode = 'MUTE';
    ctl.selectEntry(eb);
    assert.deepEqual([a.mode, b.mode, c.mode], [2, 0, 2]);
    assert.equal(ctl._config.activeId, eb.id);
  } finally {
    await h.cleanup();
  }
});

test('Clean Missing cancellation is non-mutating; confirmation removes only stale IDs', async () => {
  const h = await loadFrontendHarness();
  try {
    const Stage = h.registered.get('Universal Workflow Controller/Stage Controller');
    const graph = new FakeGraph();
    const live = graph.add(basicNode(301, 0));
    const ctl = graph.add(new Stage());
    const e = ctl.addEntry('Stage');
    e.targets = [live.id, 999];

    h.window.confirm = () => false;
    ctl.clearMissingBindings();
    assert.deepEqual(e.targets, [301, 999]);

    h.window.confirm = () => true;
    ctl.clearMissingBindings();
    assert.deepEqual(e.targets, [301]);
    assert.equal(live.mode, 0);
  } finally {
    await h.cleanup();
  }
});

test('multiple controllers warn on overlap but do not mutate unbound targets', async () => {
  const h = await loadFrontendHarness();
  try {
    const Stage = h.registered.get('Universal Workflow Controller/Stage Controller');
    const graph = new FakeGraph();
    const a = graph.add(basicNode(401, 0));
    const b = graph.add(basicNode(402, 0));
    const c1 = graph.add(new Stage());
    const c2 = graph.add(new Stage());
    const e1 = c1.addEntry('Stage'); e1.targets = [a.id];
    const e2 = c2.addEntry('Stage'); e2.targets = [a.id];
    assert.equal(c1.crossControllerOverlapCount(), 1);
    assert.equal(c2.crossControllerOverlapCount(), 1);

    h.app.canvas.selectedItems = new Set([a]);
    c1.bind(e1);
    e1.disableMode = 'MUTE';
    // Invoke the public stage state through the UI-equivalent core action by dispatching state render is already covered.
    c1.render();
    assert.equal(b.mode, 0);
  } finally {
    await h.cleanup();
  }
});


test('Bind Selected does not reuse a stale previous selection', async () => {
  const h = await loadFrontendHarness();
  try {
    const Stage = h.registered.get('Universal Workflow Controller/Stage Controller');
    const graph = new FakeGraph();
    const a = graph.add(basicNode(501, 0));
    const ctl = graph.add(new Stage());
    const ea = ctl.addEntry('Stage');
    const eb = ctl.addEntry('Stage');

    h.app.canvas.selectedItems = new Set([a]);
    ctl.captureSelectionSnapshot();
    assert.equal(ctl.bind(ea), true);
    assert.deepEqual(ea.targets, [501]);

    h.app.canvas.selectedItems = new Set();
    ctl.captureSelectionSnapshot();
    assert.equal(ctl.bind(eb), false);
    assert.deepEqual(eb.targets, []);
  } finally {
    await h.cleanup();
  }
});

test('same-controller duplicate binding is blocked before mutation', async () => {
  const h = await loadFrontendHarness();
  try {
    const Stage = h.registered.get('Universal Workflow Controller/Stage Controller');
    const graph = new FakeGraph();
    const a = graph.add(basicNode(601, 0));
    a.title = 'Target A';
    const ctl = graph.add(new Stage());
    const ea = ctl.addEntry('Stage'); ea.label = 'A';
    const eb = ctl.addEntry('Stage'); eb.label = 'B';

    h.app.canvas.selectedItems = new Set([a]);
    ctl.captureSelectionSnapshot();
    assert.equal(ctl.bind(ea), true);

    h.app.canvas.selectedItems = new Set([a]);
    ctl.captureSelectionSnapshot();
    assert.equal(ctl.bind(eb), false);
    assert.deepEqual(ea.targets, [601]);
    assert.deepEqual(eb.targets, []);
  } finally {
    await h.cleanup();
  }
});

test('Select Bound selects exactly the live targets for that entry', async () => {
  const h = await loadFrontendHarness();
  try {
    const Stage = h.registered.get('Universal Workflow Controller/Stage Controller');
    const graph = new FakeGraph();
    const a = graph.add(basicNode(701, 0));
    const b = graph.add(basicNode(702, 0));
    const c = graph.add(basicNode(703, 0));
    const ctl = graph.add(new Stage());
    const e = ctl.addEntry('Stage');
    e.targets = [a.id, c.id];

    h.app.canvas.selectedItems = new Set([b]);
    assert.equal(ctl.selectBound(e), true);
    assert.deepEqual([...h.app.canvas.selectedItems].map((n) => n.id).sort(), [701, 703]);
  } finally {
    await h.cleanup();
  }
});
