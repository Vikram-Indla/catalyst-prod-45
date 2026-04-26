# Local lessons log — to be folded into the skill's §19

The skill file is read-only in this Cowork session, so new lessons land
here first. When you next open the skill (or run `/skill-creator` to
edit it), copy these into `SKILL.md` §19.

---

## L20 — Vite transform cache can pin a single file in stale form

**Date:** 2026-04-26
**Surface:** /project-hub/BAU/backlog (`src/components/shared/JiraTable/JiraTable.tsx`)

**Pattern:** During the BAU/backlog audit, five disk-resident edits
(header text-transform/color/weight/letter-spacing + Summary col widthCss)
were repeatedly served by Vite as the pre-edit module — re-probes
returned old computed styles even though `grep` of the file confirmed
the new values. A soft Vite restart (`Ctrl+C` then `npm run dev`) did
NOT clear it. Other files in the same repo HMR'd correctly. The watcher
had a sandbox-mount inotify gap: the host filesystem changed, but
Vite's in-memory transform cache + `node_modules/.vite/deps` had keyed
the file at its previous mtime+content hash and never re-checked it.

**Symptom signature (recognise the failure mode):**
- Probe shows pre-edit values; `cat`/`grep` of the file shows post-edit values.
- HMR ping in the browser console fires but no update arrives for that module.
- Other unrelated edits HMR fine — only one or two files are stuck.
- `touch` on the file does not unstick it; `vite --force` does not unstick it.
- The literal pre-edit CSS string can be found verbatim inside an
  injected `<style>` tag in the document head.

**Rule (nuclear-fix protocol — apply IN ORDER, stop when probe shows
post-edit values):**
1. `pkill -9 -f vite` AND `pkill -9 -f 'node.*8080'` (force-kill, not
   graceful — the graceful shutdown path is what's holding the stale
   cache). Verify zero matches in `ps aux | grep -E 'vite|node'`.
2. `rm -rf node_modules/.vite node_modules/.vite-temp` (also delete
   `.vite-temp` if present).
3. `touch -m src/path/to/StuckFile.tsx` to bump mtime forward.
4. `npm run dev` cold start.
5. Hard-reload the browser tab (`Cmd+Shift+R`) — service worker /
   browser cache can also cache the transformed module.
6. Re-probe via Chrome MCP `javascript_tool` and confirm post-edit
   values before declaring the patch landed.

**Do NOT** edit the file again "to bump the cache" — that masks the
bug and risks divergence between disk and what Vite serves. The file
is correct on disk; the dev server is wrong.

---

## L21 — Always grep for `<<<<<<< HEAD` before declaring "Vite won't start"

**Date:** 2026-04-26
**Surface:** /project-hub/BAU/backlog (during the same Vite-stuck loop)

**Pattern:** A `git pull` partway through an audit (sync'ing in a
peer's branch) introduced unmerged conflict markers into
`package.json`, `vite.config.ts`, and the lockfile. Dev server then
failed to start at all — but the error message was a JSON parse error,
not "merge conflict". Spent ~15 min debugging "why is Vite broken"
before noticing the `<<<<<<<` / `=======` / `>>>>>>>` markers.

**Rule:** Before applying the L20 nuclear-fix protocol or filing a
"Vite won't start" finding, run:
```
grep -rn '<<<<<<< HEAD\|=======\|>>>>>>> ' \
  package.json package-lock.json vite.config.ts tsconfig*.json src/
```
If anything matches, the failure is a git conflict, not a server bug.
Resolve the conflict (or `git merge --abort` / `git stash`) before
touching Vite state. NEVER assume a stalled dev server is exclusively
a caching problem during an audit that was preceded by a pull / merge
/ rebase.

---

## L22 — `pkill -f vite` from sandbox bash does NOT reach the host (NEW this session)

**Date:** 2026-04-26
**Surface:** /project-hub/BAU/backlog

**Pattern:** Tried to apply L20 from the Cowork sandbox bash. The
sandbox is a Linux VM mounted into the host filesystem, but it has its
own process tree. `pkill` kills sandbox processes only — never the
host's `vite` process running in the user's macOS terminal. Wasted a
turn assuming the kill landed.

**Rule:** All `pkill` / process-kill steps in L20 MUST be run by the
human in their host terminal. The sandbox can only handle the
filesystem-side cleanup (`rm -rf node_modules/.vite`) and the file
mtime bump (`touch -m ...`). Always emit explicit instructions for the
human:
1. (human) `pkill -9 -f vite; pkill -9 -f 'node.*8080'`
2. (sandbox) `rm -rf node_modules/.vite node_modules/.vite-temp`
3. (sandbox) `touch -m src/path/to/StuckFile.tsx`
4. (human) `npm run dev`

The split is non-negotiable.

---

## L23 — When Vite "restart" leaves a literal pre-edit CSS string in the DOM, suspect duplicate processes (NEW this session)

**Date:** 2026-04-26
**Surface:** /project-hub/BAU/backlog

**Pattern:** Vikram restarted Vite. Probe showed the pre-edit CSS
string verbatim in an injected `<style>` tag. The disk was clean. No
service worker. cmd+shift+r didn't help. Cause turned out to be a
second `vite` process surviving the `Ctrl+C` (the wrapper terminated
but the worker did not).

**Rule:** When the L20 protocol "doesn't take", before re-running it,
have the human verify zero residual processes:
```
ps aux | grep -E 'vite|node' | grep -v grep
lsof -i :8080
```
If anything is listed, escalate to `kill -9 <pid>` on each PID before
re-running L20. The standard `pkill -f vite` can miss workers spawned
under different names (e.g., `node /path/to/vite.js`).
