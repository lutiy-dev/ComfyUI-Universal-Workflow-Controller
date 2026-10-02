# START HERE — Universal Workflow Controller LAB

## Goal

Install once, perform one complete runtime acceptance test, and report PASS/FAIL.

## Install — ComfyUI Portable (Windows)

From the `ComfyUI_windows_portable\ComfyUI\custom_nodes` directory:

```bat
git clone -b dev/universal-workflow-controller https://github.com/lutiy-dev/AI-render.git ComfyUI-Universal-Workflow-Controller
```

Then fully restart ComfyUI.

No `pip install` and no `npm install` are required for runtime use.

## Update during LAB

```bat
cd ComfyUI-Universal-Workflow-Controller
git pull
```

Restart ComfyUI after an update.

## Uninstall

Close ComfyUI, then remove:

```text
ComfyUI\custom_nodes\ComfyUI-Universal-Workflow-Controller
```

Restart ComfyUI.

## Find the nodes

In Add Node search, search for:

```text
Universal Stage Controller
Universal Exclusive Switch
```

Category:

```text
utils / Universal Workflow Controller
```

## Recommended one-pass test

Create three small independent branches or choose three safe existing branches that are easy to verify.

### Stage Controller

1. Add `Universal Stage Controller`.
2. Add three stages.
3. Rename them `A`, `B`, `C`.
4. Select branch A nodes on the canvas and click `Bind Selected` for A.
5. Repeat for B and C.
6. Test ON/OFF with MUTE.
7. Change one stage OFF mode to BYPASS and test it.
8. Put A/B/C in different initial modes.
9. SOLO B.
10. SOLO C without Restore.
11. Press Restore.
12. Verify the exact original A/B/C modes return.
13. Save workflow, close/reopen it, and verify names/bindings/modes remain valid.
14. Switch workflow tabs and return; verify state remains valid.
15. Delete one bound target and verify the controller shows a missing/broken binding without silently rebinding.
16. Use `Clean Missing` and verify only stale references are removed.

### Exclusive Switch

1. Add `Universal Exclusive Switch`.
2. Add A/B/C options and bind each to a branch.
3. Select A, then B, then C.
4. Verify exactly the selected option is active among registered options.
5. Test a mix of MUTE and BYPASS off-modes.
6. Save/reload and verify configuration persists.

### Multiple controllers

1. Add a second controller with different targets.
2. Verify actions in controller 1 do not touch unbound targets of controller 2.
3. Intentionally bind one target to both controllers and verify an overlap warning appears.

## PASS

PASS only if all critical actions work and the browser console shows no package-caused errors.

## FAIL / STOP

Stop and report immediately if:
- controller nodes do not render in Nodes 2.0;
- `Bind Selected` binds the wrong nodes;
- unregistered nodes change mode;
- workflow fails to save/reload;
- ComfyUI throws repeated frontend exceptions;
- SOLO Restore fails to restore exact previous modes.

Do not continue testing destructive or production workflows after any of those failures.
