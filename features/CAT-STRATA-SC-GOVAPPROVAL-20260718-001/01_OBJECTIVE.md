# Objective

Deliver and independently verify a complete governed Scorecard model version lifecycle in STRATA:

- Author edits a draft (perspective weights, measures), sees an honest integrity checklist.
- Submit resolves an eligible approver (chooser of active strategy_office/admin holders, excluding submitter/creator), shows the resolved target, blocks on validation blockers, creates exactly one open approval task atomically, notifies the approver.
- Author can Withdraw (task cancelled, same version back to draft).
- Assigned approver can Approve / Request changes / Reject — comments/reasons mandatory for the latter two; only the assigned approver (not the submitter, not an unrelated admin) may decide.
- Changes requested returns the SAME version to an editable state with the reviewer comment shown prominently; resubmission increments the attempt counter, never the version number.
- Approve reruns full validation server-side, is concurrency/double-click safe, atomically activates the new version and supersedes the predecessor (repo convention: `approved` == active; supersede handled in the same transaction).
- Rejected is terminal.
- Every transition is server-enforced (RPC-only), SoD-compliant, audited append-only, notified, tenant/RLS-safe.
- Historical calc provenance (instances pinned to model rows + frozen versions) untouched.
