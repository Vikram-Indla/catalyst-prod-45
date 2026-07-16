/**
 * STRATA notification bell — CAT-STRATA-CLOSEOUT-20260710-001 W3b.
 * Unread badge + inbox popup on the STRATA shell. Reads strata_notifications
 * (RLS: own rows only); marks read via governed RPCs. Deep-links resolve to the
 * relevant AREA landing — entity ids are UUIDs and cannot build slug routes, so
 * we navigate to the area rather than fabricate a per-entity link.
 * Canonical only: Atlaskit Popup + Badge + Button; ADS tokens; lucide icon.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Popup from '@atlaskit/popup';
import Badge from '@atlaskit/badge';
import { Button, EmptyState, Spinner } from '@/components/ads';
import { Bell } from '@/lib/atlaskit-icons';
import { Routes } from '@/lib/routes';
import { governanceApi } from '@/modules/strata/domain';
import { useStrataNotifications, useInvalidateStrata } from '@/modules/strata/hooks/useStrata';
import { fmtDateTime } from '@/modules/strata/components/format';
import type { StrataNotification } from '@/modules/strata/types';

/** entity_table → area landing. The fallback when the object can't be resolved. */
function areaFor(n: StrataNotification): string {
  switch (n.entity_table) {
    case 'strata_decisions':
    case 'strata_actions':
      return Routes.strata.reviews();
    case 'strata_dependencies':
      return Routes.strata.execution();
    case 'strata_benefit_values':
      return Routes.strata.portfolio();
    case 'strata_kpis':
      return Routes.strata.kpis();
    default:
      // config_pending_approval and anything else → the admin change log.
      return Routes.strata.adminSection('change-log');
  }
}

/** entity_table + resolved slug/key → the OBJECT route (anchor 28 state 3). */
function objectRouteFor(n: StrataNotification, key: string): string | null {
  switch (n.entity_table) {
    case 'strata_kpis': return Routes.strata.kpi(key);
    case 'strata_benefit_values': return Routes.strata.benefit(key);
    case 'strata_decisions': return Routes.strata.review(key);
    case 'strata_dependencies': return Routes.strata.projectCard(key);
    default: return null;
  }
}

export function StrataNotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const q = useStrataNotifications();
  const invalidate = useInvalidateStrata();
  const items = q.data ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  const openItem = async (n: StrataNotification) => {
    setOpen(false);
    if (!n.read_at) {
      try { await governanceApi.markNotificationRead(n.id); invalidate(); } catch { /* non-blocking */ }
    }
    // Land on the OBJECT when its slug resolves; fall back to the area landing
    // when it doesn't (orphaned/deleted entity) rather than build a broken link.
    let path = areaFor(n);
    try {
      const t = await governanceApi.resolveNotificationTarget(n);
      const objectPath = t.key ? objectRouteFor(n, t.key) : null;
      if (objectPath) path = objectPath;
    } catch { /* resolution is best-effort — the area landing still works */ }
    // ?n= lets StrataPageShell render the "why am I here" provenance band.
    navigate(`${path}${path.includes('?') ? '&' : '?'}n=${encodeURIComponent(n.id)}`);
  };

  const markAll = async () => {
    try { await governanceApi.markAllNotificationsRead(); invalidate(); } catch { /* surfaced by refetch */ }
  };

  return (
    <Popup
      isOpen={open}
      onClose={() => setOpen(false)}
      placement="bottom-end"
      content={() => (
        <div style={{ width: 360, maxHeight: 460, overflowY: 'auto' }} data-testid="strata-notifications-panel">
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderBottom: '1px solid var(--ds-border)', position: 'sticky', top: 0,
            background: 'var(--ds-surface-overlay)', zIndex: 1,
          }}>
            <span style={{ fontWeight: 600, color: 'var(--ds-text)' }}>Notifications</span>
            {unread > 0 ? (
              <Button appearance="subtle" spacing="compact" onClick={markAll} testId="strata-notifications-mark-all">
                Mark all read
              </Button>
            ) : null}
          </div>
          {q.isLoading ? (
            <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}><Spinner size="medium" /></div>
          ) : items.length === 0 ? (
            <EmptyState size="compact" header="You're all caught up" description="Approvals, assignments, blockers and validation requests will appear here." />
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => void openItem(n)}
                data-testid={`strata-notification-${n.id}`}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                  padding: 'var(--ds-space-100) var(--ds-space-200)', border: 'none', borderBottom: '1px solid var(--ds-border)',
                  background: n.read_at ? 'transparent' : 'var(--ds-background-selected)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {!n.read_at ? (
                    <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ds-background-brand-bold)', flexShrink: 0 }} />
                  ) : <span style={{ width: 8, flexShrink: 0 }} />}
                  <span style={{ fontWeight: n.read_at ? 400 : 600, color: 'var(--ds-text)', fontSize: 'var(--ds-font-size-100)' }}>{n.title}</span>
                </div>
                {n.body ? (
                  <div style={{ margin: 'var(--ds-space-025) 0 0 var(--ds-space-200)', color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-075)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>
                ) : null}
                <div style={{ margin: 'var(--ds-space-025) 0 0 var(--ds-space-200)', color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-075)' }}>{fmtDateTime(n.created_at)}</div>
              </button>
            ))
          )}
        </div>
      )}
      trigger={(triggerProps) => (
        <button
          {...triggerProps}
          type="button"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          onClick={() => setOpen((v) => !v)}
          data-testid="strata-notifications-bell"
          style={{
            position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 4, border: 'none', cursor: 'pointer',
            background: open ? 'var(--ds-background-neutral-subtle-hovered)' : 'transparent',
            color: 'var(--ds-icon)',
          }}
        >
          <Bell size={18} />
          {unread > 0 ? (
            <span style={{ position: 'absolute', top: -2, right: -2 }}>
              <Badge appearance="important">{unread > 99 ? '99+' : unread}</Badge>
            </span>
          ) : null}
        </button>
      )}
    />
  );
}
