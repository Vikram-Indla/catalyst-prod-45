-- CAT-WIKI-RESTORE-20260705-001 — demo content seed for the restored Wiki module.
-- Environment-specific demo data (applied to staging cyij). Idempotent: no-op if
-- any wiki_domains rows already exist, so re-running is safe.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.wiki_domains) THEN
    RAISE NOTICE 'wiki_domains already populated — skipping demo seed';
    RETURN;
  END IF;

  WITH d AS (
    INSERT INTO public.wiki_domains (domain_code,name,icon,description,sort_order) VALUES
      ('ENG','Engineering','code','Engineering practices, standards, and onboarding',1),
      ('OPS','Operations','settings','Runbooks, incident response, and operational guides',2)
    RETURNING id, domain_code
  ),
  c AS (
    INSERT INTO public.wiki_categories (domain_id, category_code, name, description, level, sort_order)
    SELECT d.id, v.code, v.name, v.descr, 1, v.so
    FROM (VALUES
      ('ENG','eng-onboarding','Onboarding','Getting started',1),
      ('ENG','eng-standards','Standards','Engineering standards',2),
      ('OPS','ops-runbooks','Runbooks','Operational runbooks',1)
    ) v(dc,code,name,descr,so)
    JOIN d ON d.domain_code=v.dc
    RETURNING id, category_code
  ),
  p AS (
    INSERT INTO public.wiki_pages (slug,title,domain_code,category_id,status,lead_content,tldr,format,read_time_minutes,author_name,ai_confidence,source_coverage,tags,verification_status)
    SELECT v.slug, v.title, v.dc, c.id, 'published', v.lead, v.tldr, 'article', v.rt, v.author, 0.9, 0.85, v.tags::text[], 'verified'
    FROM (VALUES
      ('engineering-onboarding-guide','Engineering Onboarding Guide','ENG','eng-onboarding','Welcome to the engineering team. This guide walks new engineers through environment setup, repository access, and first-week milestones.','Set up your environment, get repo access, ship a small change in week one.',8,'Platform Team','{onboarding,setup}'),
      ('code-review-standards','Code Review Standards','ENG','eng-standards','Our code review standards define what reviewers look for: correctness, readability, test coverage, and adherence to the design system.','Review for correctness, readability, tests, and ADS compliance.',6,'Platform Team','{review,standards}'),
      ('git-branching-model','Git Branching Model','ENG','eng-standards','How we branch, name, and merge. Trunk-based with short-lived feature branches and required checks before merge.','Trunk-based, short-lived branches, green checks before merge.',5,'Platform Team','{git,workflow}'),
      ('incident-response-runbook','Incident Response Runbook','OPS','ops-runbooks','Step-by-step incident response: detect, declare, mitigate, communicate, and run a blameless postmortem.','Detect, declare, mitigate, communicate, postmortem.',7,'SRE Team','{incident,oncall}'),
      ('deployment-checklist','Deployment Checklist','OPS','ops-runbooks','Pre-flight and post-deploy checks to ship safely: migrations, feature flags, smoke tests, rollback plan.','Migrations, flags, smoke tests, rollback plan.',4,'SRE Team','{deploy,release}')
    ) v(slug,title,dc,ccode,lead,tldr,rt,author,tags)
    JOIN c ON c.category_code=v.ccode
    RETURNING id, slug
  ),
  s AS (
    INSERT INTO public.wiki_sections (page_id, section_number, title, content, sort_order)
    SELECT p.id, v.sn, v.title, v.content, v.sn
    FROM (VALUES
      ('engineering-onboarding-guide',1,'Environment Setup','Install Node, clone the monorepo, and run the dev server on port 8080.'),
      ('engineering-onboarding-guide',2,'Repository Access','Request access via the platform team. Enable 2FA and SSH keys.'),
      ('engineering-onboarding-guide',3,'First Week','Pick a starter issue, open a PR, and get it reviewed and merged.'),
      ('code-review-standards',1,'What Reviewers Check','Correctness, edge cases, readability, tests, and design-system tokens.'),
      ('code-review-standards',2,'Turnaround','Aim to review within one business day.'),
      ('incident-response-runbook',1,'Detect and Declare','Acknowledge the alert, declare severity, open an incident channel.'),
      ('incident-response-runbook',2,'Mitigate','Roll back or flag off the offending change. Restore service first.'),
      ('incident-response-runbook',3,'Postmortem','Write a blameless postmortem within 48 hours.')
    ) v(slug,sn,title,content)
    JOIN p ON p.slug=v.slug
    RETURNING id
  ),
  q AS (
    INSERT INTO public.wiki_quick_refs (title, description, steps, domain_code, icon, sort_order, linked_page_id)
    SELECT v.title, v.descr, v.steps, v.dc, v.icon, v.so, p.id
    FROM (VALUES
      ('Open a Pull Request','Branch, commit, push, open PR, request review',5,'ENG','git-pull-request',1,'git-branching-model'),
      ('Declare an Incident','Ack alert, set severity, open channel',3,'OPS','alert-triangle',2,'incident-response-runbook'),
      ('Ship a Deploy','Run checklist, deploy, smoke test',4,'OPS','rocket',3,'deployment-checklist')
    ) v(title,descr,steps,dc,icon,so,slug)
    JOIN p ON p.slug=v.slug
    RETURNING id
  )
  INSERT INTO public.wiki_learning_paths (title, description, icon, domain_code, difficulty, article_ids, estimated_hours, article_count, sort_order)
  SELECT 'New Engineer Onboarding','From zero to first merged PR','graduation-cap','ENG','beginner',
    array(select id from public.wiki_pages where slug in ('engineering-onboarding-guide','code-review-standards','git-branching-model')),
    2.0, 3, 1;
END $$;
