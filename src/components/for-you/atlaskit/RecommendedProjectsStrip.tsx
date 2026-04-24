/**
 * RecommendedProjectsStrip — horizontal strip of project cards at the
 * top of the For You page, directly above the tab bar.
 *
 * Jira's version: horizontally scrollable row of ~6 project cards, each
 * showing the project kind icon + name + short subtitle, with a "View all
 * projects" link pinned to the right. Clicking a card routes to the
 * project's home; clicking "View all projects" routes to /projects.
 *
 * Data source
 * ───────────
 * We derive the 6 projects from the user's currently-visible items —
 * ranked by how many of those items sit in that project, then alpha. This
 * matches Jira's "projects you're closest to" behavior without needing a
 * separate server-side ranking.
 *
 * No fetches: the page shell already has the items, so we accept a list
 * and render. Empty items → render with a skeleton so the strip isn't a
 * layout hole.
 */
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import { ChevronRight } from 'lucide-react';
import ProjectKindIcon, { pickProjectKind } from '@/components/shared/ProjectKindIcon';
import type { WorkItem } from '@/hooks/useForYouData';

interface RecommendedProjectsStripProps {
  items: WorkItem[];
  maxCards?: number;
}

interface ProjectCard {
  key: string;
  name: string;
  count: number;
  kind: ReturnType<typeof pickProjectKind>;
  projectId?: string;
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
          kind: pickProjectKind(item.projectKey, item.issueType),
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
      aria-label="Recommended spaces"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginBlockEnd: 24,
      }}
    >
      {/* Header row: title + "View all projects" link */}
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
            font: `600 14px/20px "Inter", system-ui, sans-serif`,
            color: token('color.text', '#172B4D'),
            margin: 0,
          }}
        >
          Recommended spaces
        </h2>
        <button
          type="button"
          onClick={() => navigate('/projects')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            font: `500 14px/20px "Inter", system-ui, sans-serif`,
            color: token('color.link', '#0C66E4'),
            padding: 4,
          }}
        >
          View all projects
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Horizontal scroll strip */}
      <div
        style={{
          display: 'grid',
          gridAutoFlow: 'column',
          gridAutoColumns: 'minmax(180px, 1fr)',
          gap: 12,
          overflowX: 'auto',
          paddingBlockEnd: 4,
        }}
      >
        {cards.map(card => (
          <ProjectCardButton
            key={card.key}
            card={card}
            onClick={() => {
              // Prefer routing to the canonical project surface — ProjectHub.
              // Falls back to /projects if we don't have a projectId yet.
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
        gap: 10,
        padding: '12px 14px',
        background: hover
          ? token('elevation.surface.hovered', 'rgba(9,30,66,0.06)')
          : token('elevation.surface', '#FFFFFF'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: 8,
        cursor: 'pointer',
        textAlign: 'left',
        outline: 'none',
        transition: 'background-color 150ms ease, border-color 150ms ease',
        borderColor: hover
          ? token('color.border.bold', '#091E4224')
          : token('color.border', '#DFE1E6'),
      }}
    >
      <ProjectKindIcon kind={card.kind} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            font: `600 13px/18px "Inter", system-ui, sans-serif`,
            color: token('color.text', '#172B4D'),
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {card.name}
        </div>
        <div
          style={{
            font: `400 12px/16px "Inter", system-ui, sans-serif`,
            color: token('color.text.subtle', '#626F86'),
          }}
        >
          {card.count} {card.count === 1 ? 'item' : 'items'}
        </div>
      </div>
    </button>
  );
}
