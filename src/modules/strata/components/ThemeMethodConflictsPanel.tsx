/**
 * Admin surface listing every Theme whose measurement method is unresolved (both Objectives and
 * Theme-owned OKRs present) — CAT-STRATA-THEMEMETHOD-20260720-001. Renders nothing when there are
 * none, so it is safe to mount unconditionally. Resolution happens on each Theme's detail page via
 * the governed ThemeMethodResolveModal; this panel is the discovery/entry point.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button, Lozenge } from '@/components/ads';
import { Routes } from '@/lib/routes';
import { strategyApi } from '../domain';
import { StrataPanel, T } from './shared';

export function ThemeMethodConflictsPanel() {
  const navigate = useNavigate();
  const conflictsQ = useQuery({
    queryKey: ['strata', 'theme-method-conflicts'],
    queryFn: strategyApi.themeMethodConflicts,
    staleTime: 0,
  });
  const conflicts = conflictsQ.data ?? [];
  if (conflicts.length === 0) return null;

  return (
    <div data-testid="strata-method-conflicts-admin" style={{ marginBottom: 'var(--ds-space-200)' }}>
      <StrataPanel title="Measurement method — needs resolution" count={conflicts.length}>
        <p style={{ margin: '0 0 8px', fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
          These Themes hold both Strategic Objectives and Theme-owned OKRs. New Objectives, KPIs and OKRs are
          blocked on them until an administrator selects the intended method (no records are deleted or converted).
        </p>
        <div style={{ display: 'grid', gap: 6 }}>
          {conflicts.map((c) => (
            <div key={c.theme_id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Lozenge appearance="moved">Unresolved</Lozenge>
              <strong style={{ color: T.text }}>{c.theme?.name ?? c.theme_id}</strong>
              <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
                {c.objective_count} Objective{c.objective_count === 1 ? '' : 's'} · {c.theme_okr_count} Theme-owned OKR{c.theme_okr_count === 1 ? '' : 's'}
              </span>
              {c.theme?.slug ? (
                <span style={{ marginLeft: 'auto' }}>
                  <Button spacing="compact" appearance="subtle"
                    onClick={() => navigate(Routes.strata.strategyElement(c.theme!.slug!))}>
                    Review &amp; resolve
                  </Button>
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </StrataPanel>
    </div>
  );
}
