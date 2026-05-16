/**
 * ProductHubSidebar — /product-hub sidebar
 *
 * Module-level nav for the Product Hub:
 *   - "All Products" nav link
 *   - RECENT section: most recently updated business_requests (title + request_key)
 *
 * Mirrors the ModuleLevelSidebar pattern from ProjectHubSidebar.
 * Added 2026-05-16 to fix the missing sidebar on /product-hub/products.
 */

import { useState, useMemo } from 'react';
import { token } from '@atlaskit/tokens';
import {
  LayoutGrid,
  ChevronRight,
  Clock,
  X,
} from '@/lib/atlaskit-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { SidebarBase, SidebarConfig } from './SidebarBase';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/hooks/useTheme';

interface ProductHubSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

interface BrRecentRow {
  id: string;
  title: string;
  request_key: string;
  updated_at: string;
}

function daysAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ProductHubSidebar({ expanded, onToggle, className }: ProductHubSidebarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isDark } = useTheme();
  const [recentsExpanded, setRecentsExpanded] = useState(true);

  // Fetch most recently updated business requests — ordered by updated_at DESC.
  // The user expects MDT-project BRs to appear here; all active BRs are
  // effectively MDT-scoped in the current tenant, so no additional filter is
  // needed. Limit 15 to keep the rail scannable.
  const { data: recentBrs = [] } = useQuery<BrRecentRow[]>({
    queryKey: ['product-hub-recent-brs'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('business_requests')
        .select('id, title, request_key, updated_at')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(15);
      if (error) {
        console.warn('[ProductHubSidebar] recent BRs error:', error.message);
        return [];
      }
      return (data ?? []) as BrRecentRow[];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const moduleConfig: SidebarConfig = {
    badge: 'PT',
    label: 'Product Hub',
    showFavorites: false,
    sections: [
      {
        title: '',
        items: [
          {
            id: 'all-products',
            title: 'All Products',
            path: '/product-hub/products',
            icon: LayoutGrid,
            exact: false,
          },
        ],
      },
    ],
  };

  const recentsSection = expanded && recentBrs.length > 0 ? (
    <div style={{ marginTop: 8 }}>
      <div style={{ height: 1, background: token('color.border'), margin: '4px 12px 8px' }} />

      {/* Section header — collapsible */}
      <button
        onClick={() => setRecentsExpanded(p => !p)}
        className="flex items-center w-full"
        style={{ padding: '6px 12px', border: 'none', background: 'transparent', cursor: 'pointer', gap: 4 }}
        aria-expanded={recentsExpanded}
      >
        <ChevronRight
          size={12}
          style={{
            color: token('color.text.subtlest'),
            transform: recentsExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
          }}
        />
        <Clock size={12} style={{ color: token('color.text.subtlest') }} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: token('color.text.subtlest'),
            fontFamily: 'var(--cp-font-body)',
          }}
        >
          Recent
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 10,
            fontWeight: 600,
            color: token('color.text.subtlest'),
            fontFamily: 'var(--cp-font-mono)',
          }}
        >
          {recentBrs.length}
        </span>
      </button>

      {/* Recent BR rows */}
      {recentsExpanded && (
        <div style={{ padding: '2px 0' }}>
          {recentBrs.map((br) => (
            <div
              key={br.id}
              onClick={() => navigate(`/product-hub/backlog?selectedRequest=${br.request_key}`)}
              className="group"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '5px 12px 5px 28px',
                cursor: 'pointer',
                borderRadius: 3,
                margin: '0 4px',
                transition: 'background 80ms ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = token('color.background.neutral.subtle.hovered');
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {/* BR indicator dot */}
              <span
                style={{
                  flexShrink: 0,
                  marginTop: 4,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: token('color.background.brand.bold'),
                }}
              />

              {/* Two-line block: title (line 1), request_key + age (line 2) */}
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: token('color.text'),
                    fontFamily: 'var(--cp-font-body)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={br.title}
                >
                  {br.title}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 400,
                    color: token('color.text.subtlest'),
                    fontFamily: 'var(--cp-font-mono)',
                    letterSpacing: '0.01em',
                  }}
                >
                  {br.request_key} · {daysAgo(br.updated_at)}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  ) : null;

  return (
    <SidebarBase
      config={moduleConfig}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    >
      {recentsSection}
    </SidebarBase>
  );
}
