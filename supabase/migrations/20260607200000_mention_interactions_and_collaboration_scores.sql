-- ============================================================
-- Migration: Mention Interaction Recording + Collaboration Scores
-- Purpose: Powers weighted @mention suggestions (4-tier scoring)
--          and mention notification dispatch.
--
-- Tables:
--   1. mention_interactions — bidirectional interaction log
--   2. collaboration_scores — pre-computed nightly scores
--   3. mention_notifications — per-user mention notification records
--
-- Dependencies: profiles(id), ph_issues(id), ph_jira_projects(id)
-- ============================================================

-- ─── 1. mention_interactions ─────────────────────────────────────────────────
-- Records bidirectional interactions between users on every comment,
-- mention, assignment, or co-watching event. Powers Tier 3 (collaboration)
-- in the mention scoring engine.

CREATE TABLE IF NOT EXISTS public.mention_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    interaction_type VARCHAR(30) NOT NULL CHECK (interaction_type IN (
        'mention', 'comment_alongside', 'assign', 'watch_together'
    )),
    work_item_id UUID REFERENCES public.ph_issues(id) ON DELETE SET NULL,
    project_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent exact duplicate interactions in the same second
    CONSTRAINT no_self_interaction CHECK (actor_id != target_id)
);

-- Indexes for the scoring engine's candidate pool builder
CREATE INDEX idx_mention_interactions_actor_target
    ON public.mention_interactions(actor_id, target_id);
CREATE INDEX idx_mention_interactions_actor_created
    ON public.mention_interactions(actor_id, created_at DESC);
CREATE INDEX idx_mention_interactions_target
    ON public.mention_interactions(target_id);
CREATE INDEX idx_mention_interactions_created
    ON public.mention_interactions(created_at DESC);

-- RLS: authenticated users can insert their own interactions
--       and read all interactions (needed for scoring engine)
ALTER TABLE public.mention_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own interactions"
    ON public.mention_interactions
    FOR INSERT TO authenticated
    WITH CHECK (actor_id = auth.uid());

CREATE POLICY "Users can read all interactions"
    ON public.mention_interactions
    FOR SELECT TO authenticated
    USING (true);


-- ─── 2. collaboration_scores ─────────────────────────────────────────────────
-- Pre-computed nightly by pg_cron. Each row represents the collaboration
-- strength between two users based on their interaction history (90-day window).

CREATE TABLE IF NOT EXISTS public.collaboration_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    collaborator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    interaction_count INT NOT NULL DEFAULT 0,
    last_interaction_at TIMESTAMPTZ NOT NULL,
    score FLOAT NOT NULL DEFAULT 0,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, collaborator_id)
);

CREATE INDEX idx_collab_scores_user_score
    ON public.collaboration_scores(user_id, score DESC);

-- RLS: all authenticated users can read (needed by mention picker);
--       only the batch job (service role) writes.
ALTER TABLE public.collaboration_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read collaboration scores"
    ON public.collaboration_scores
    FOR SELECT TO authenticated
    USING (true);

-- Service role bypasses RLS for INSERT/UPDATE/DELETE (nightly batch).
-- No user-facing write policy needed.


-- ─── 3. mention_notifications ────────────────────────────────────────────────
-- Created when a user is @mentioned in a comment. Feeds into the
-- existing NotificationPanel / DirectPanel UI.

CREATE TABLE IF NOT EXISTS public.mention_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    work_item_id UUID NOT NULL REFERENCES public.ph_issues(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.ph_comments(id) ON DELETE CASCADE,
    notification_type VARCHAR(30) NOT NULL DEFAULT 'mention' CHECK (notification_type IN (
        'mention', 'comment_on_watched', 'comment_on_assigned'
    )),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate notifications for same mention in same comment
    UNIQUE(recipient_id, comment_id, notification_type)
);

CREATE INDEX idx_mention_notif_recipient_unread
    ON public.mention_notifications(recipient_id, is_read, created_at DESC)
    WHERE is_read = false;
CREATE INDEX idx_mention_notif_recipient_created
    ON public.mention_notifications(recipient_id, created_at DESC);

ALTER TABLE public.mention_notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
    ON public.mention_notifications
    FOR SELECT TO authenticated
    USING (recipient_id = auth.uid());

-- Users can insert notifications for others (when they mention someone)
CREATE POLICY "Users can create notifications"
    ON public.mention_notifications
    FOR INSERT TO authenticated
    WITH CHECK (actor_id = auth.uid());

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
    ON public.mention_notifications
    FOR UPDATE TO authenticated
    USING (recipient_id = auth.uid())
    WITH CHECK (recipient_id = auth.uid());


-- ─── 4. pg_cron job: nightly collaboration score refresh ─────────────────────
-- Aggregates last 90 days of mention_interactions into collaboration_scores.
-- Runs at 2 AM UTC daily. Uses service role (bypasses RLS).

SELECT cron.schedule(
    'refresh-collaboration-scores',
    '0 2 * * *',
    $$
    INSERT INTO public.collaboration_scores
        (user_id, collaborator_id, interaction_count, last_interaction_at, score, computed_at)
    SELECT
        actor_id AS user_id,
        target_id AS collaborator_id,
        COUNT(*) AS interaction_count,
        MAX(created_at) AS last_interaction_at,
        LEAST(
            150 +
            (LN(GREATEST(COUNT(*), 1)) / LN(2)) * 30 +
            150 * POWER(2, -EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / (14 * 86400)),
            500
        ) AS score,
        NOW() AS computed_at
    FROM public.mention_interactions
    WHERE created_at > NOW() - INTERVAL '90 days'
    GROUP BY actor_id, target_id
    ON CONFLICT (user_id, collaborator_id)
    DO UPDATE SET
        interaction_count = EXCLUDED.interaction_count,
        last_interaction_at = EXCLUDED.last_interaction_at,
        score = EXCLUDED.score,
        computed_at = EXCLUDED.computed_at;

    DELETE FROM public.collaboration_scores
    WHERE last_interaction_at < NOW() - INTERVAL '90 days';
    $$
);


-- ─── 5. Enable Realtime on mention_notifications ─────────────────────────────
-- So NotificationPanel gets live updates when someone is mentioned.

ALTER PUBLICATION supabase_realtime ADD TABLE public.mention_notifications;
