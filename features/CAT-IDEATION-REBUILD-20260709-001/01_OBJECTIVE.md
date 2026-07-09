# Objective

Replace the legacy Ideation module with a greenfield, Catalyst-native Ideation hub that turns unstructured demand into governed, strategy-traceable Business Requests.

**Done means** (full grid: 04 §J + 05 K-delta):
1. `/ideation` ships Inbox / Explore / Portfolio / Detail / Create on canonical components, module key `ideation` (decoupled from ENABLE_AI)
2. Lifecycle runs on the `ph_wf_*` workflow runtime with 3 new guards; terminal states RLS-locked
3. Conversion creates `business_requests` (MIM-N) with `source_idea_id` backlink, live rollup, auto-Delivered
4. AI Copilot (suggestion ledger, confidence + evidence, human-only apply) passes eval gates
5. Governed scoring framework (admin models/drivers, versioned)
6. Notifications close the submitter loop; Caty persona + voice + docintel intake
7. EN/AR + RTL + dark mode; mobile behaviors per 04 C.11
8. Legacy ideation inventory decommissioned (03 §12) with signed data disposition
9. Zero legacy carryover: no reads of ph_ideas, no legacy components/hooks/services imported

**Non-goals**: public portal intake, campaigns, pairwise ranking, per-field merge survivor choice, configurable swipe (all P2).
