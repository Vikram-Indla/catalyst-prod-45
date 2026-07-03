-- CAT-INCIDENT-GOVERNANCE-20260703-001
-- Committee voting: allow a committee member to create their OWN vote row.
--
-- Session 1 locked committee_votes writes down to service_role (intended for
-- the submit-vote / send-to-committee edge functions). Those edge functions
-- were never deployed, so client-side voting was dead end-to-end: pending vote
-- rows could not be created, and the members' UPDATE policy had nothing to act
-- on. This adds a narrow INSERT policy scoped to the voting member only —
-- exactly mirroring the trust model of the existing "Members can vote" UPDATE
-- policy (member_id must belong to a committee_members row owned by auth.uid()).
--
-- The service_role INSERT policy is left in place (additive) so a future
-- edge-function path still works. Votes remain tamper-scoped: a member can
-- only ever write their own vote, never someone else's.

CREATE POLICY "Members can create their own vote"
  ON public.committee_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.committee_members cm
      WHERE cm.id = committee_votes.member_id
        AND cm.user_id = auth.uid()
    )
  );
