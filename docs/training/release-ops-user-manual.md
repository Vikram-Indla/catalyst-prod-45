# Release Operations — User Manual

Plain-English guide for everyone involved in a deployment. Release Operations lives under **Release Operations** in the left sidebar.

## 1. What Release Operations is
It is Catalyst's deployment-control center. It tracks *what* is shipping (releases and change records), *how* it ships (SOP runbooks), *who* executes each step, *who approves*, and *what happened* in production (production events + replay). Everything links together so nothing gets lost.

## 2. Roles at a glance
- **Release Manager** — owns releases; sees the whole picture across timeline, board, calendar, sign-off queue.
- **Change Manager** — owns a change record and its SOP execution, sign-offs, and issues.
- **Developer** — executes SOP steps assigned to them (see them in **For You**).
- **QA / Validator** — runs validation steps; raises defects when checks fail.
- **Approver (Product Owner / Admin)** — approves or rejects sign-offs and emergency overrides in the **Sign-off Queue**.

## 3. Create a Change Record
1. Go to **Change Records → New change**.
2. Fill in title, type, risk, target environment, deployment category, planned window.
3. **Link one or more releases** (a change can support several).
4. If it is a **production change with no release**, you must add a justification.
5. Save. The change opens as a full-page cockpit.

## 4. Link releases
On **Change Detail → Cockpit → Linked releases** you see every release the change supports. Add or change links from **Edit change**. A production change with no linked release is flagged red.

## 5. Apply an SOP Template
1. Open the change → **SOP** tab → **Apply SOP template**.
2. Pick an active template, preview the generated steps and their planned times.
3. Choose **Append** or **Replace not-started**, then **Generate steps**.

## 6. Execute SOP steps
On the **SOP** tab each step shows its owner, planned/actual time, and status.
- **Start** a step (stamps the actual start).
- Add **commit** and **evidence** while it runs.
- **Mark done** (technical steps need a commit; evidence-required steps need evidence; validation steps need an actual result).
- **Block** or **Fail** a step — a **reason is required**.
Rollback steps are shown in amber and stay pending until you need them.

## 7. Use For You
**For You → Change execution** shows the SOP steps assigned to you with a live timer (upcoming / running / overdue), plus prompts (due soon, overdue, missing commit/evidence). You can start/complete/block your step right there. Managers also see "Changes you manage."

## 8. Use the Execution Calendar
**Execution** shows deployment-day SOP steps by the hour (Day) or across the week. Running steps show **● LIVE**, late steps show **LATE**, and steps with linked issues show **⚠**. Click any slot to open the change.

## 9. Use the Change Board
**Change Board** groups changes by lifecycle lane (Draft → Closed + Failed/Rolled-back + Cancelled). Drag a card to move it — invalid moves are rejected with an explanation; failing/cancelling a change asks for a reason. Cards show risk, releases, SOP/approval progress, and a ⚠ issue count.

## 10. Request and approve sign-offs
- Anyone managing a change/release can **Request sign-off** (from the change header or the Sign-off Queue).
- Approvers open the **Sign-off Queue** — a visual map of Release → Change → Gate. Approve or **Reject** (rejection needs a reason). Overdue and rejected gates stay visible.

## 11. Emergency override
If a gate (sign-off / freeze) blocks a critical deployment, a Release/Change Manager clicks **Request override** on the change and gives a reason. A Product Owner or Admin approves or rejects it in the Sign-off Queue (with a decision comment). The override never deletes the original gate — it is recorded as an audited bypass and marked everywhere.

## 12. Raise an incident or defect
From **Change Detail → Incidents & defects** or from a SOP step, click **Raise incident** or **Raise defect**. This opens Catalyst's normal Create Incident / Create Defect window, and automatically links the issue back to this release, change, and SOP step. Use **Incident** for operational breakage; **Defect** for a failed validation/test.

## 13. Production Event Replay
When a production change completes, click **Generate/Refresh prod event** on the change, then **Open replay →**. The replay is a full page that tells the whole story: an executive summary, release/change context, the SOP timeline (planned vs actual), commit and evidence ledgers, the sign-off/override/freeze trails, incidents/defects, and the final outcome. Use **Copy summary** to share it.

## 14. Common warnings
- **Unlinked production change** — a production change with no release; add a justification.
- **Freeze conflict** — the window overlaps a change freeze; needs an approved override.
- **Missing commit / evidence** — a required step has not captured its commit/evidence.
- **Overdue** — a step or approval passed its due time.
- **Reconstructed** (on replay scope) — the point-in-time snapshot wasn't stored, so scope was rebuilt from current links.

## 15. When a deployment is blocked
Check the change cockpit markers: a pending/rejected sign-off, a freeze conflict, or a missing SOP. Resolve the gate (get the approval, reschedule, or request an emergency override). The board's rejected-move message tells you exactly which gate blocks progress.

## 16. After deployment completes
Mark the final SOP steps done, generate/refresh the production event, open the replay, confirm no open critical incidents remain, and copy the summary for your release notes / audit.
