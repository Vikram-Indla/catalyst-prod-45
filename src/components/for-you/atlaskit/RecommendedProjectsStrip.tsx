/**
 * RecommendedProjectsStrip — horizontal strip of project cards at the top
 * of the For You page, directly above the tab bar.
 *
 * Parity target (from /jira-compare 2026-04-24, iteration 3):
 *   - 3 cards only (cap: maxCards=3). Jira's strip caps at 3 regardless of
 *     how many spaces the user has — extras live behind "View all".
 *   - Card: 230w × 61h, radius 4, padding 12px 16px, 0.56px subtle border.
 *   - Icon: 32×32 @atlaskit/avatar appearance="square" (radius 4). When
 *     `src` is set → image. When unset → Atlaskit's hashed-initials tile
 *     (same fallback Jira uses for spaces without a custom avatar).
 *   - Title: Inter 600 14px/20px, ellipsis single-line.
 *   - Subtitle: "Software project" (Catalyst vocab divergence — Jira says
 *     "Software space" because its container is a "space"). Inter 400
 *     12px/16px, color.text.subtlest.
 *   - Heading: "Recommended projects" (house vocab divergence from Jira's
 *     "Recommended spaces"), Inter 600 16px/20px, color.text.
 *   - View all: "View all projects" → /projects — text color, weight 400.
 *   - Layout: wrapping grid at minmax(230px, 1fr), gap 16.
 *
 * Data source
 * ───────────
 * Jira's strip is account-scoped, not tab-scoped — the same projects render
 * regardless of which For You tab is active. We mirror that by consuming the
 * `allUserProjects` collection from useForYouData() instead of deriving from
 * the per-tab visible items. This fixes the "dancing" bug where cards
 * changed count and order on every tab click.
 *
 * When `projects[i].avatar_url` is set, @atlaskit/avatar renders the image.
 * When null, it renders a hashed-initials tile derived from `name`.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import Avatar from '@atlaskit/avatar';
import type { Project } from '@/hooks/useForYouData';

interface RecommendedProjectsStripProps {
  projects: Project[];
  maxCards?: number;
}

export default function RecommendedProjectsStrip({ projects, maxCards = 3 }: RecommendedProjectsStripProps) {
  const navigate = useNavigate();

  // Alpha-sort and cap. No reduce over items, no per-tab dependency — the
  // same `projects` value produces the same cards every render.
  const cards = React.useMemo(() => {
    return [...projects]
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, maxCards);
  }, [projects, maxCards]);

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
          Jira parity note: the heading is 16/20 weight 600 and the "View
          all" link is plain body text color/weight — NOT a blue link. */}
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
          onMouseEnter={(e) => { e.currentTarget.style.textDecorationColor = 'currentColor'; }}
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
            key={card.id}
            card={card}
            onClick={() => {
              // Prefer the canonical ProjectHub route when we have an id.
              if (card.id) navigate(`/projects/${card.id}`);
              else navigate('/projects');
            }}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Project card ───────────────────────────────────────────────────────────

function ProjectCardButton({ card, onClick }: { card: Project; onClick: () => void }) {
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
        // Phase 12 (2026-04-29): reverted to Atlaskit token(). Phase 11
        // loaded Atlaskit's dark theme — `elevation.surface` flips natively.
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
          Atlaskit's Avatar at size="medium" is 32×32; appearance="square"
          applies the 4px radius. When `src` is set we render the branded
          image; when null, Atlaskit renders the hashed-initials fallback —
          the same fallback Jira uses for projects without a custom avatar. */}
      <Avatar
        appearance="square"
        size="medium"
        name={card.name}
        src={card.avatar_url || undefined}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            // Jira parity: flat weight 400. Primary color provides the
            // hierarchy against the 400-subtle subtitle beneath.
            font: `400 14px/20px "Inter", system-ui, sans-serif`,
            color: token('color.text', '#292A2E'),
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            letterSpacing: 0,
          }}
        >
          {card.name}
        </div>
        {/* Subtitle — Jira parity: shows the project product type beneath the title.
            Jira's equivalent text is "Software space" (all spaces in digital-transformation
            tenant are Software spaces). Catalyst vocab divergence: we say "project" not
            "space", so this reads "Software project" — consistent with the header's
            "Recommended projects" and the "View all projects" link. */}
        <div
          style={{
            font: `400 12px/16px "Inter", system-ui, sans-serif`,
            color: token('color.text.subtlest', '#626F86'),
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          Software project
        </div>
      </div>
    </button>
  );
}
