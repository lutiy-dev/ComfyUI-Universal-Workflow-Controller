# Changelog

## 0.1.1 — 2026-10-02

Runtime binding hardening after first real Nodes 2.0 acceptance test.

Fixed / improved:
- controller-local click-time selection snapshot; stale previous selections are no longer reused;
- same-controller duplicate target bindings are blocked before mutation;
- actual target state is shown as ON / MUTED / BYPASSED / MIXED instead of generic OFF;
- bound target names are visible in each row;
- new `Select` action selects the targets currently bound to an entry for visual verification;
- health refresh now reacts to exact target mode changes;
- automated frontend tests extended for stale-selection safety, duplicate-binding rejection, and Select Bound.

## 0.1.0-lab — 2026-10-02

Initial one-pass LAB implementation.

Added:
- Universal Stage Controller;
- Universal Exclusive Switch;
- dynamic user-defined entries;
- Bind Selected / rebind;
- MUTE / BYPASS;
- SOLO / exact in-session RESTORE;
- All On / All Off;
- missing-target detection and cleanup;
- reorder / rename / clear / remove;
- same-controller and cross-controller overlap warnings;
- workflow-local persistence;
- pure-core automated tests;
- mocked frontend-adapter integration tests;
- install/test documentation.

Deferred:
- automatic Queue/Run;
- deep cross-subgraph binding;
