/**
 * RecommendedProjectsStrip — horizontal strip of project cards at the top
 * of the For You page, directly above the tab bar.
 *
 * Parity target (from /jira-compare 2026-04-24):
 *   - Card: 230w × 62h, radius 4, padding 12px 16px, 1.11px subtle border
 *   - Icon: 32×32 @atlaskit/avatar appearance="square" (radius 4, initials)
 *     when no avatar_url is available.
 *   - Heading: "Recommended projects" (house vocab divergence from Jira's
 *     "Recommended spaces"), Inter 600 16px/20px, color.text
 *   - View all: "View all projects" → /projects — text color, weight 400
 *   - Layout: wrapping grid at minmax(230px, 1fr), gap 16 — NOT horizontal
 *     scroll. Jira's strip wraps onto subsequent rows at narrow widths and
 *     has no overflow-x:auto.
 *
 * Data source
 * ───────────
 * We derive the 6 projects from the user's currently-visible items — ranked
 * by how many of those items sit in that project, then alpha. This matches
 * Jira's "projects you're closest to" behavior without needing a separate
 * server-side ranking.
 *
 * Icon sourcing
 * ─────────────
 * Jira binds the card image to a project-configured avatar URL (e.g.
 * /rest/api/2/universal_avatar/view/type/project/avatar/10413). Catalyst's
 * `projects` table does not currently store an avatar_url, so we let
 * Atlaskit's <Avatar appearance="square" /> render initials on a
 * deterministically-hashed square — this is the same fallback Jira uses
 * when a project hasn't uploaded a custom avatar. If/when we plumb
 * `projects.avatar_url` through `useForYouData`, pass it as `src` here and
 * Atlaskit switches to the image automatically.
 */
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import Avatar from '@atlaskit/avatar';
import type { WorkItem } from '@/hooks/useForYouData';

interface RecommendedProjectsStripProps {
  items: WorkItem[];
  maxCards?: number;
}

interface ProjectCard {
  key: string;
  name: string;
  count: number;
  projectId?: string;
  avatarUrl?: string;
}

export default function RecommendedProjectsStrip({ items, maxCards = 6 }: RecommendedProjectsStripProps) {
  const navigate = useNavigate();

  const cards = useMemo<ProjectCard[]>(() => {
    const byKey = new Map<string, ProjectCard>();
    items.forEach(item => {
      if (!item.projectKey) return;
      const existing = byKey.get(item.projectKey);
      if (existing) {
        existing.count += 1;
      } else {
        byKey.set(item.projectKey, {
          key: item.projectKey,
          name: item.project,
          count: 1,
          projectId: item.projectId,
        });
      }
    });
    return Array.from(byKey.values())
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, maxCards);
  }, [items, maxCards]);

  if (cards.length === 0) return null;

  return (
    <section
      aria-label="Recommended projects"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginBlockEnd: 24,
      }}
    >
      {/* Header row: title + "View all projects" link.
          Jira parity note: the heading is 16/20 weight 600 (maps to
          Atlaskit's 653) and the "View all" link is plain body text
          color/weight — NOT a blue link. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingInline: 2,
        }}
      >
        <h2
          style={{
            font: `600 16px/20px "Inter", system-ui, sans-serif`,
            color: token('color.text', '#292A2E'),
            margin: 0,
          }}
        >
          Recommended projects
        </h2>
        <button
          type="button"
          onClick={() => navigate('/projects')}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            font: `400 14px/20px "Inter", system-ui, sans-serif`,
            color: token('color.text', '#292A2E'),
            padding: 4,
            textDecoration: 'underline',
            textDecorationColor: 'transparent',
            textUnderlineOffset: 3,
            transition: 'text-decoration-color 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.textDecorationColor = token('color.text', '#292A2E'); }}
          onMouseLeave={(e) => { e.currentTarget.style.textDecorationColor = 'transparent'; }}
        >
          View all projects
        </button>
      </div>

      {/* Wrapping grid — Jira parity: cards fit at 230px min, wrap naturally. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
          gap: 16,
        }}
      >
        {cards.map(card => (
          <ProjectCardButton
            key={card.key}
            card={card}
            onClick={() => {
              // Prefer the canonical ProjectHub route when we have an id.
              if (card.projectId) navigate(`/projects/${card.projectId}`);
              else navigate('/projects');
            }}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Project card ───────────────────────────────────────────────────────────

function ProjectCardButton({ card, onClick }: { card: ProjectCard; onClick: () => void }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        // Jira parity: 62px total height, 12/16 padding.
        height: 62,
        padding: '12px 16px',
        background: hover
          ? token('elevation.surface.hovered', '#F0F1F2')
          : token('elevation.surface', '#FFFFFF'),
        border: `1px solid ${token('color.border', 'rgba(11,18,14,0.14)')}`,
        borderRadius: 4,
        cursor: 'pointer',
        textAlign: 'left',
        outline: 'none',
        transition: 'background-color 150ms ease',
        minWidth: 0,
      }}
    >
      {/* 32×32 square avatar with radius 4 — matches Jira's project avatar tile.
          Atlaskit's Avatar at size="medium" is 32×32 (size="small" is 24×24,
          too small for this surface); appearance="square" applies the 4px
          radius and when no src is set it shows hashed initials — the same
          fallback Jira renders for projects without a custom avatar. */}
      <Avatar
        appearance="square"
        size="medium"
        name={card.name}
        src={card.avatarUrl}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            font: `600 14px/20px "Inter", system-ui, sans-serif`,
            color: token('color.text', '#292A2E'),
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {card.name}
        </div>
      </div>
    </button>
  );
}
