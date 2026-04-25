/**
 * HomeSidebar — personal command center on the / route.
 *
 * The original Home rail was empty (no hub context = no rail content), so
 * users saw a 240px-wide grey column on every visit. C1 turns that dead
 * pixel into the user's "where do I want to go" surface:
 *
 *   ┌─ Pinned ─────────────────────┐
 *   │  ★ STORY-401  Riyadh launch  │
 *   │  ★ TASK-118   Q3 ramp memo   │
 *   ├─ Recent ─────────────────────┤
 *   │  ⏱ Project: Aramco rollout   │
 *   │  ⏱ TestHub                   │
 *   ├─ Jump to ────────────────────┤
 *   │  ▣ Strategy Hub              │
 *   │  ▣ Product Room              │
 *   │  …                           │
 *   └──────────────────────────────┘
 *
 * Atlaskit-only contract
 * ──────────────────────
 *   Every primitive comes from @atlaskit/side-navigation, @atlaskit/heading,
 *   or @atlaskit/primitives. No bespoke <button>, no Tailwind utility
 *   classes for colour/spacing, no `type.*` references — every value
 *   resolves through ADS tokens so dark-mode / WCAG / spacing parity is
 *   inherited automatically.
 *
 * Surface
 * ───────
 *   The host wrapper (CatalystShell) sets a 240px width. We render
 *   elevation.surface as the background — explicitly NOT sunken (per the
 *   B5 critique "background can't be grey"). A right-edge divider via
 *   color.border keeps the rail visually separated from the content.
 *
 * Data sources (all existing — no new tables, no new edge fns)
 * ────────────
 *   Pinned   ← useStarredDeliveryItems()  (user_starred_items)
 *   Recent   ← useRecentRooms()           (recent_rooms)
 *   Jump to  ← HUBS constant from @/lib/hubs
 */
import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  SideNavigation,
  NavigationContent,
  Section,
  ButtonItem,
  LinkItem,
  HeadingItem,
  SkeletonItem,
} from '@atlaskit/side-navigation';
import { Box, Text, xcss } from '@atlaskit/primitives';
import StarFilledIcon from '@atlaskit/icon/glyph/star-filled';
import RecentIcon from '@atlaskit/icon/glyph/recent';
import { useStarredDeliveryItems } from '@/hooks/home/useStarredItems';
import { useRecentRooms } from '@/hooks/useRecentRooms';
import { HUBS } from '@/lib/hubs';
import { useGlobalSearchStore } from '@/store/globalSearchStore';

const PINNED_LIMIT = 5;
const RECENT_LIMIT = 5;

// Outer rail container — fills the 240px wrapper from CatalystShell with a
// raised surface. Right-edge divider via color.border separates the rail
// from the page canvas without painting a heavy panel boundary.
const railStyles = xcss({
  height: '100%',
  width: '100%',
  backgroundColor: 'elevation.surface',
  borderInlineEndWidth: 'border.width',
  borderInlineEndStyle: 'solid',
  borderInlineEndColor: 'color.border',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

// Empty-state cell — used when a section has no rows yet (no pins, no
// recent activity). Quiet copy, no CTA — the rail is never the place to
// teach a new user how to star something; that affordance lives where
// the items themselves render.
const emptyCellStyles = xcss({
  paddingInline: 'space.200',
  paddingBlock: 'space.100',
});

export default function HomeSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const openDetail = useGlobalSearchStore(s => s.openDetail);

  const { data: starredData, isLoading: starredLoading } = useStarredDeliveryItems();
  const { recentRooms, loading: recentLoading } = useRecentRooms({ limit: RECENT_LIMIT });

  const pinned = useMemo(() => (starredData?.items ?? []).slice(0, PINNED_LIMIT), [starredData]);
  const recent = useMemo(() => recentRooms.slice(0, RECENT_LIMIT), [recentRooms]);

  return (
    <Box xcss={railStyles}>
      <SideNavigation label="Home navigation">
        <NavigationContent>
          {/* ─── Section 1 · Pinned ──────────────────────────────────── */}
          <Section>
            <HeadingItem>Pinned</HeadingItem>
            {starredLoading && (
              <>
                <SkeletonItem isShimmering />
                <SkeletonItem isShimmering />
              </>
            )}
            {!starredLoading && pinned.length === 0 && (
              <Box xcss={emptyCellStyles}>
                <Text size="small" color="color.text.subtle">
                  Nothing pinned yet.
                </Text>
              </Box>
            )}
            {!starredLoading && pinned.map((item) => (
              <ButtonItem
                key={`pinned-${item.id}`}
                iconBefore={<StarFilledIcon label="" size="small" />}
                description={item.summary}
                onClick={() => openDetail({
                  id: item.id,
                  itemType: item.type,
                  projectKey: item.projectKey,
                })}
              >
                {item.key}
              </ButtonItem>
            ))}
          </Section>

          {/* ─── Section 2 · Recent ──────────────────────────────────── */}
          <Section>
            <HeadingItem>Recent</HeadingItem>
            {recentLoading && (
              <>
                <SkeletonItem isShimmering />
                <SkeletonItem isShimmering />
              </>
            )}
            {!recentLoading && recent.length === 0 && (
              <Box xcss={emptyCellStyles}>
                <Text size="small" color="color.text.subtle">
                  No recent activity.
                </Text>
              </Box>
            )}
            {!recentLoading && recent.map((room) => (
              <ButtonItem
                key={`recent-${room.id}`}
                iconBefore={<RecentIcon label="" size="small" />}
                description={room.room_subtitle ?? undefined}
                onClick={() => navigate(room.room_path)}
              >
                {room.room_name}
              </ButtonItem>
            ))}
          </Section>

          {/* ─── Section 3 · Jump to ─────────────────────────────────── */}
          <Section hasSeparator>
            <HeadingItem>Jump to</HeadingItem>
            {HUBS.map((hub) => {
              const isActive = location.pathname.startsWith(hub.path);
              return (
                <LinkItem
                  key={hub.id}
                  iconBefore={hub.glyph}
                  href={hub.path}
                  isSelected={isActive}
                  onClick={(e) => {
                    // Intercept so we use react-router instead of a hard nav.
                    e.preventDefault();
                    navigate(hub.path);
                  }}
                >
                  {hub.label}
                </LinkItem>
              );
            })}
          </Section>
        </NavigationContent>
      </SideNavigation>
    </Box>
  );
}
