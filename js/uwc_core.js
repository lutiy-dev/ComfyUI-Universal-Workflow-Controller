export const SCHEMA_VERSION = 1;

export const MODES = Object.freeze({
  ALWAYS: 0,
  NEVER: 2,
  BYPASS: 4,
});

export const DISABLE_MODES = Object.freeze({
  MUTE: "MUTE",
  BYPASS: "BYPASS",
});

export function makeId(prefix = "entry") {
  const r = globalThis.crypto?.randomUUID?.();
  return r ? `${prefix}-${r}` : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function isValidTargetId(value) {
  return typeof value === "number" || (typeof value === "string" && value.length > 0);
}

export function sanitizeTargetIds(ids = []) {
  const out = [];
  const seen = new Set();
  for (const id of Array.isArray(ids) ? ids : []) {
    if (!isValidTargetId(id)) continue;
    const key = `${typeof id}:${String(id)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(id);
  }
  return out;
}

export function makeEntry(label = "Stage") {
  return {
    id: makeId("uwc"),
    label,
    targets: [],
    disableMode: DISABLE_MODES.MUTE,
  };
}

export function makeConfig(kind = "stage") {
  return {
    schemaVersion: SCHEMA_VERSION,
    kind,
    entries: [],
    activeId: null,
  };
}

export function normalizeEntry(raw, fallbackLabel = "Stage") {
  const e = raw && typeof raw === "object" ? raw : {};
  const label = typeof e.label === "string" && e.label.trim() ? e.label.trim() : fallbackLabel;
  return {
    id: typeof e.id === "string" && e.id ? e.id : makeId("uwc"),
    label,
    targets: sanitizeTargetIds(e.targets),
    disableMode: e.disableMode === DISABLE_MODES.BYPASS ? DISABLE_MODES.BYPASS : DISABLE_MODES.MUTE,
  };
}

export function normalizeConfig(raw, kind = "stage") {
  const cfg = raw && typeof raw === "object" ? raw : {};
  const entries = Array.isArray(cfg.entries)
    ? cfg.entries.map((e, i) => normalizeEntry(e, kind === "exclusive" ? `Option ${i + 1}` : `Stage ${i + 1}`))
    : [];
  const ids = new Set();
  for (const e of entries) {
    if (ids.has(e.id)) e.id = makeId("uwc");
    ids.add(e.id);
  }
  const activeId = typeof cfg.activeId === "string" && ids.has(cfg.activeId) ? cfg.activeId : null;
  return {
    schemaVersion: SCHEMA_VERSION,
    kind,
    entries,
    activeId,
  };
}

export function disableModeToNodeMode(disableMode) {
  return disableMode === DISABLE_MODES.BYPASS ? MODES.BYPASS : MODES.NEVER;
}

export function getNodeById(graph, id) {
  if (!graph || id == null) return null;
  try {
    if (typeof graph.getNodeById === "function") return graph.getNodeById(id) ?? null;
  } catch {}
  const nodes = Array.isArray(graph._nodes) ? graph._nodes : [];
  return nodes.find((n) => n?.id === id) ?? null;
}

export function resolveEntry(graph, entry) {
  const valid = [];
  const missing = [];
  for (const id of sanitizeTargetIds(entry?.targets)) {
    const node = getNodeById(graph, id);
    if (node) valid.push(node);
    else missing.push(id);
  }
  return { valid, missing };
}

export function entryHealth(graph, entry) {
  const { valid, missing } = resolveEntry(graph, entry);
  const total = sanitizeTargetIds(entry?.targets).length;
  let state = "UNBOUND";
  if (total > 0 && valid.length === 0) state = "BROKEN";
  else if (valid.length > 0) {
    const active = valid.filter((n) => n.mode === MODES.ALWAYS).length;
    state = active === valid.length ? "ON" : active === 0 ? "OFF" : "MIXED";
    if (missing.length) state = `PARTIAL_${state}`;
  }
  return {
    state,
    total,
    valid: valid.length,
    missing: missing.length,
    missingIds: missing,
    validNodes: valid,
  };
}

export function collectTargetIds(config) {
  const out = [];
  const seen = new Set();
  for (const entry of config?.entries ?? []) {
    for (const id of sanitizeTargetIds(entry.targets)) {
      const key = `${typeof id}:${String(id)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(id);
    }
  }
  return out;
}

export function findOverlaps(config) {
  const owners = new Map();
  for (const entry of config?.entries ?? []) {
    for (const id of sanitizeTargetIds(entry.targets)) {
      const key = `${typeof id}:${String(id)}`;
      if (!owners.has(key)) owners.set(key, { id, entryIds: [] });
      owners.get(key).entryIds.push(entry.id);
    }
  }
  return [...owners.values()].filter((x) => x.entryIds.length > 1);
}

function setNodeMode(node, mode) {
  if (!node) return false;
  const old = node.mode;
  if (old === mode) return false;
  node.mode = mode;
  return true;
}

function notifyGraphChanged(graph) {
  try { graph?.change?.(); } catch {}
  try { graph?.setDirtyCanvas?.(true, true); } catch {}
}

export function setModes(graph, assignments = []) {
  let changed = 0;
  for (const [id, mode] of assignments) {
    const node = getNodeById(graph, id);
    if (!node) continue;
    if (setNodeMode(node, mode)) changed += 1;
  }
  if (changed) notifyGraphChanged(graph);
  return changed;
}

export function setEntryEnabled(graph, entry, enabled) {
  const { valid } = resolveEntry(graph, entry);
  if (!valid.length) return 0;
  const mode = enabled ? MODES.ALWAYS : disableModeToNodeMode(entry.disableMode);
  let changed = 0;
  for (const node of valid) if (setNodeMode(node, mode)) changed += 1;
  if (changed) notifyGraphChanged(graph);
  return changed;
}

export function toggleEntry(graph, entry) {
  const { valid } = resolveEntry(graph, entry);
  if (!valid.length) return { enabled: false, changed: 0 };
  const currentlyOn = valid.every((n) => n.mode === MODES.ALWAYS);
  const enabled = !currentlyOn;
  return { enabled, changed: setEntryEnabled(graph, entry, enabled) };
}

export function setAllEntries(graph, config, enabled) {
  let changed = 0;
  for (const entry of config?.entries ?? []) changed += setEntryEnabled(graph, entry, enabled);
  return changed;
}

export function snapshotModes(graph, ids) {
  const snapshot = [];
  for (const id of sanitizeTargetIds(ids)) {
    const node = getNodeById(graph, id);
    if (!node) continue;
    snapshot.push([id, Number.isFinite(node.mode) ? node.mode : MODES.ALWAYS]);
  }
  return snapshot;
}

export function applySolo(graph, config, entryId, existingSnapshot = null) {
  const selected = config?.entries?.find((e) => e.id === entryId);
  if (!selected) return { ok: false, snapshot: existingSnapshot ?? [], changed: 0, reason: "ENTRY_NOT_FOUND" };

  const selectedResolved = resolveEntry(graph, selected);
  if (!selectedResolved.valid.length) {
    return { ok: false, snapshot: existingSnapshot ?? [], changed: 0, reason: "NO_VALID_TARGETS" };
  }

  const snapshot = existingSnapshot?.length ? existingSnapshot : snapshotModes(graph, collectTargetIds(config));
  let changed = 0;

  // Disable all non-selected entries first.
  for (const entry of config.entries) {
    if (entry.id === entryId) continue;
    changed += setEntryEnabled(graph, entry, false);
  }
  // Selected entry wins when bindings overlap.
  changed += setEntryEnabled(graph, selected, true);

  return { ok: true, snapshot, changed, reason: null };
}

export function restoreSnapshot(graph, snapshot) {
  if (!Array.isArray(snapshot) || !snapshot.length) return 0;
  return setModes(graph, snapshot);
}

export function applyExclusive(graph, config, activeId) {
  const selected = config?.entries?.find((e) => e.id === activeId);
  if (!selected) return { ok: false, changed: 0, reason: "ENTRY_NOT_FOUND" };
  const selectedResolved = resolveEntry(graph, selected);
  if (!selectedResolved.valid.length) return { ok: false, changed: 0, reason: "NO_VALID_TARGETS" };

  let changed = 0;
  for (const entry of config.entries) {
    if (entry.id === activeId) continue;
    changed += setEntryEnabled(graph, entry, false);
  }
  // Selected entry wins if targets overlap.
  changed += setEntryEnabled(graph, selected, true);
  return { ok: true, changed, reason: null };
}

export function moveEntry(entries, entryId, delta) {
  const index = entries.findIndex((e) => e.id === entryId);
  if (index < 0) return false;
  const next = Math.max(0, Math.min(entries.length - 1, index + delta));
  if (next === index) return false;
  const [item] = entries.splice(index, 1);
  entries.splice(next, 0, item);
  return true;
}

export function replaceTargets(entry, targetIds) {
  entry.targets = sanitizeTargetIds(targetIds);
  return entry.targets;
}
