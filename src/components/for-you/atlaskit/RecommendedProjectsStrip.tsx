/**
 * RecommendedProjectsStrip — horizontal strip of space cards (projects +
 * products) at the top of the For You page, directly above the tab bar.
 *
 * Parity target (from /jira-compare 2026-04-24, iteration 3):
 *   - 3 cards only (cap: maxCards=3). Jira's strip caps at 3 regardless of
 *     how many spaces the user has — extras live behind "View all".
 *   - Card: 230w × 61h, radius 4, padding 12px 16px, 0.56px subtle border.
 *   - Icon: 32×32 @atlaskit/avatar appearance="square" (radius 4). When
 *     `src` is set → image. When unset → Atlaskit's hashed-initials tile
 *     (same fallback Jira uses for spaces without a custom avatar).
 *   - Title: Inter 600 14px/20px, ellipsis single-line.
 *   - Heading: "Recommended" — generic so it covers both projects and
 *     products without tying the label to a specific hub type.
 *   - View all: "View all" — navigates to the all-projects page.
 *   - Layout: wrapping grid at minmax(230px, 1fr), gap 16.
 *
 * Data sources
 * ────────────
 * - `projects` prop: Project Hub spaces from useForYouData().allUserProjects
 * - `products`: fetched directly from the `products` table so Product Hub
 *   spaces (e.g. "Investor Journey") appear alongside projects.
 *
 * Sort order: most-recently-visited space first (max visitedAt across all
 * sections of the same space), then alpha for ties and unvisited spaces.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { ProjectIcon } from '@/components/shared/ProjectIcon';
import type { Project } from '@/hooks/useForYouData';
import { useRecentProjects } from '@/hooks/home/useRecentProjects';
import { supabase } from '@/integrations/supabase/client';

interface RecommendedProjectsStripProps {
  projects: Project[];
  maxCards?: number;
}

/** Internal unified shape for a card — project or product. */
interface SpaceCard {
  id: string;
  key: string;
  name: string;
  avatar_url?: string | null;
  icon?: string | null;
  color?: string | null;
  hub: 'project' | 'product';
}

export default function RecommendedProjectsStrip({ projects, maxCards = 3 }: RecommendedProjectsStripProps) {
  const navigate = useNavigate();
  const { recentLocations } = useRecentProjects(Math.max(maxCards * 2, 6));

  // Fetch Product Hub spaces alongside the Project Hub spaces passed via props.
  const { data: rawProducts = [] } = useQuery({
    queryKey: ['recommended-strip-products'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('id, code, name, color')
        .eq('is_active', true)
        .order('name');
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const cards = React.useMemo(() => {
    // Build a recency map keyed by "hub:spaceKey" → max visitedAt.
    const recentMap = new Map<string, number>();
    for (const loc of recentLocations) {
      const k = `${loc.hub}:${loc.projectKey}`;
      const prev = recentMap.get(k) ?? 0;
      if (loc.visitedAt > prev) recentMap.set(k, loc.visitedAt);
    }

    const projectCards: SpaceCard[] = projects.map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      avatar_url: p.avatar_url,
      icon: p.icon,
      color: p.color,
      hub: 'project',
    }));

    const productCards: SpaceCard[] = rawProducts.map((p: any) => ({
      id: String(p.id),
      key: p.code,
      name: p.name,
      avatar_url: null,
      icon: null,
      color: p.color ?? null,
      hub: 'product',
    }));

    // Merge, deduplicate by "hub:key", sort by recency then alpha.
    const seen = new Set<string>();
    const all: SpaceCard[] = [];
    for (const card of [...projectCards, ...productCards]) {
      const k = `${card.hub}:${card.key}`;
      if (!seen.has(k)) { seen.add(k); all.push(card); }
    }

    return all
      .sort((a, b) => {
        const tA = recentMap.get(`${a.hub}:${a.key}`) ?? 0;
        const tB = recentMap.get(`${b.hub}:${b.key}`) ?? 0;
        if (tB !== tA) return tB - tA;
        return a.name.localeCompare(b.name);
      })
      .slice(0, maxCards);
  }, [projects, rawProducts, maxCards, recentLocations]);

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
      {/* Header row: title only — no "View all" since the strip spans both project and product spaces. */}
      <div style={{ paddingInline: 2 }}>
        <h2
          style={{
            font: `600 16px/20px "Inter", system-ui, sans-serif`,
            color: token('color.text', '#292A2E'),
            margin: 0,
          }}
        >
          Recommended
        </h2>
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
          <SpaceCardButton
            key={`${card.hub}:${card.key}`}
            card={card}
            onClick={() =>
              card.hub === 'product'
                ? navigate(`/product-hub/${card.key}/dashboard`)
                : navigate(`/project-hub/${card.key}`)
            }
          />
        ))}
      </div>
    </section>
  );
}

// ─── Space card ──────────────────────────────────────────────────────────────

function SpaceCardButton({ card, onClick }: { card: SpaceCard; onClick: () => void }) {
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
        transition: 'background-color 150ms cubic-bezier(0.15, 1, 0.3, 1)',
        minWidth: 0,
      }}
    >
      <ProjectIcon
        size="large"
        projectKey={card.key}
        avatarUrl={card.avatar_url}
        iconName={card.icon}
        color={card.color}
        name={card.name}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            font: `600 14px/20px "Inter", system-ui, sans-serif`,
            color: token('color.text', '#292A2E'),
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            letterSpacing: 0,
          }}
        >
          {card.name}
        </div>
      </div>
    </button>
  );
}
