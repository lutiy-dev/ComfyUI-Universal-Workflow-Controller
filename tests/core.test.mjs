import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODES,
  DISABLE_MODES,
  makeConfig,
  makeEntry,
  normalizeConfig,
  sanitizeTargetIds,
  replaceTargets,
  entryHealth,
  findOverlaps,
  toggleEntry,
  setEntryEnabled,
  setAllEntries,
  applySolo,
  restoreSnapshot,
  applyExclusive,
  moveEntry,
  cloneJson,
} from '../js/uwc_core.js';

class MockNode {
  constructor(id, mode = MODES.ALWAYS) {
    this.id = id;
    this.mode = mode;
  }
}

class MockGraph {
  constructor(nodes = []) {
    this._nodes = nodes;
    this.changeCount = 0;
    this.dirtyCount = 0;
  }
  getNodeById(id) { return this._nodes.find((n) => n.id === id) ?? null; }
  change() { this.changeCount++; }
  setDirtyCanvas() { this.dirtyCount++; }
}

function entry(label, ids, disableMode = DISABLE_MODES.MUTE) {
  const e = makeEntry(label);
  e.targets = ids;
  e.disableMode = disableMode;
  return e;
}

test('sanitizeTargetIds preserves primitive ID types and removes duplicates', () => {
  assert.deepEqual(sanitizeTargetIds([1, 1, '1', 'a', 'a', null, {}, '']), [1, '1', 'a']);
});

test('normalizeConfig repairs malformed input safely', () => {
  const cfg = normalizeConfig({ entries: [{ id: 'x', label: '', targets: [1, 1], disableMode: 'BAD' }] }, 'stage');
  assert.equal(cfg.kind, 'stage');
  assert.equal(cfg.schemaVersion, 1);
  assert.equal(cfg.entries.length, 1);
  assert.equal(cfg.entries[0].disableMode, DISABLE_MODES.MUTE);
  assert.deepEqual(cfg.entries[0].targets, [1]);
});

test('replaceTargets rebinds and deduplicates', () => {
  const e = entry('A', [1]);
  replaceTargets(e, [2, 2, 'x']);
  assert.deepEqual(e.targets, [2, 'x']);
});

test('entryHealth reports ON/OFF/MIXED/PARTIAL/BROKEN', () => {
  const g = new MockGraph([new MockNode(1, 0), new MockNode(2, 2)]);
  assert.equal(entryHealth(g, entry('a', [1])).state, 'ON');
  assert.equal(entryHealth(g, entry('a', [2])).state, 'OFF');
  assert.equal(entryHealth(g, entry('a', [1, 2])).state, 'MIXED');
  assert.equal(entryHealth(g, entry('a', [1, 99])).state, 'PARTIAL_ON');
  assert.equal(entryHealth(g, entry('a', [99])).state, 'BROKEN');
  assert.equal(entryHealth(g, entry('a', [])).state, 'UNBOUND');
});

test('toggleEntry turns an active entry off with configured mode then back on', () => {
  const g = new MockGraph([new MockNode(1, 0), new MockNode(2, 0)]);
  const e = entry('A', [1, 2], DISABLE_MODES.BYPASS);
  let r = toggleEntry(g, e);
  assert.equal(r.enabled, false);
  assert.deepEqual(g._nodes.map((n) => n.mode), [4, 4]);
  r = toggleEntry(g, e);
  assert.equal(r.enabled, true);
  assert.deepEqual(g._nodes.map((n) => n.mode), [0, 0]);
});

test('setEntryEnabled ignores missing IDs and changes valid IDs only', () => {
  const g = new MockGraph([new MockNode(1, 0)]);
  const e = entry('A', [1, 99]);
  assert.equal(setEntryEnabled(g, e, false), 1);
  assert.equal(g.getNodeById(1).mode, 2);
});

test('setAllEntries obeys each entry disable mode', () => {
  const g = new MockGraph([new MockNode(1, 0), new MockNode(2, 0)]);
  const cfg = makeConfig('stage');
  cfg.entries = [entry('A', [1], DISABLE_MODES.MUTE), entry('B', [2], DISABLE_MODES.BYPASS)];
  setAllEntries(g, cfg, false);
  assert.equal(g.getNodeById(1).mode, 2);
  assert.equal(g.getNodeById(2).mode, 4);
});

test('SOLO captures exact pre-solo modes and RESTORE returns them exactly', () => {
  const g = new MockGraph([
    new MockNode(1, MODES.BYPASS),
    new MockNode(2, MODES.NEVER),
    new MockNode(3, MODES.ALWAYS),
  ]);
  const cfg = makeConfig('stage');
  const a = entry('A', [1]);
  const b = entry('B', [2], DISABLE_MODES.BYPASS);
  const c = entry('C', [3]);
  cfg.entries = [a, b, c];

  const first = applySolo(g, cfg, b.id, null);
  assert.equal(first.ok, true);
  assert.equal(g.getNodeById(1).mode, MODES.NEVER);
  assert.equal(g.getNodeById(2).mode, MODES.ALWAYS);
  assert.equal(g.getNodeById(3).mode, MODES.NEVER);

  // Repeated SOLO must keep the original snapshot.
  const second = applySolo(g, cfg, c.id, first.snapshot);
  assert.deepEqual(second.snapshot, first.snapshot);
  assert.equal(g.getNodeById(3).mode, MODES.ALWAYS);

  restoreSnapshot(g, second.snapshot);
  assert.equal(g.getNodeById(1).mode, MODES.BYPASS);
  assert.equal(g.getNodeById(2).mode, MODES.NEVER);
  assert.equal(g.getNodeById(3).mode, MODES.ALWAYS);
});

test('SOLO fails safely when selected entry has no valid targets', () => {
  const g = new MockGraph([new MockNode(1, 0)]);
  const cfg = makeConfig('stage');
  const a = entry('A', [99]);
  cfg.entries = [a];
  const r = applySolo(g, cfg, a.id, null);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'NO_VALID_TARGETS');
  assert.equal(g.getNodeById(1).mode, 0);
});

test('Exclusive switch disables all others and activates selected entry last', () => {
  const g = new MockGraph([new MockNode(1, 0), new MockNode(2, 0), new MockNode(3, 0)]);
  const cfg = makeConfig('exclusive');
  const a = entry('A', [1], DISABLE_MODES.MUTE);
  const b = entry('B', [2], DISABLE_MODES.BYPASS);
  const c = entry('C', [3], DISABLE_MODES.MUTE);
  cfg.entries = [a, b, c];

  const r = applyExclusive(g, cfg, b.id);
  assert.equal(r.ok, true);
  assert.deepEqual(g._nodes.map((n) => n.mode), [2, 0, 2]);
});

test('selected entry wins deterministic overlap in Exclusive', () => {
  const g = new MockGraph([new MockNode(1, 0), new MockNode(2, 0)]);
  const cfg = makeConfig('exclusive');
  const a = entry('A', [1, 2], DISABLE_MODES.MUTE);
  const b = entry('B', [2], DISABLE_MODES.BYPASS);
  cfg.entries = [a, b];
  const r = applyExclusive(g, cfg, b.id);
  assert.equal(r.ok, true);
  assert.equal(g.getNodeById(1).mode, MODES.NEVER);
  assert.equal(g.getNodeById(2).mode, MODES.ALWAYS);
});

test('findOverlaps reports repeated targets across entries', () => {
  const cfg = makeConfig('stage');
  const a = entry('A', [1, 2]);
  const b = entry('B', [2, 3]);
  cfg.entries = [a, b];
  const overlaps = findOverlaps(cfg);
  assert.equal(overlaps.length, 1);
  assert.equal(overlaps[0].id, 2);
  assert.deepEqual(overlaps[0].entryIds, [a.id, b.id]);
});

test('moveEntry changes only order', () => {
  const a = entry('A', []), b = entry('B', []), c = entry('C', []);
  const list = [a, b, c];
  assert.equal(moveEntry(list, c.id, -1), true);
  assert.deepEqual(list.map((e) => e.label), ['A', 'C', 'B']);
});

test('configuration JSON round trip preserves semantics', () => {
  const cfg = makeConfig('exclusive');
  const a = entry('Any Name', [1, 'uuid-x'], DISABLE_MODES.BYPASS);
  cfg.entries = [a];
  cfg.activeId = a.id;
  const restored = normalizeConfig(cloneJson(cfg), 'exclusive');
  assert.deepEqual(restored, cfg);
});

test('multiple controllers are isolated when bindings do not overlap', () => {
  const g = new MockGraph([new MockNode(1, 0), new MockNode(2, 0)]);
  const a = entry('A', [1]);
  const b = entry('B', [2]);
  setEntryEnabled(g, a, false);
  assert.equal(g.getNodeById(1).mode, MODES.NEVER);
  assert.equal(g.getNodeById(2).mode, MODES.ALWAYS);
  setEntryEnabled(g, b, false);
  assert.equal(g.getNodeById(2).mode, MODES.NEVER);
});
