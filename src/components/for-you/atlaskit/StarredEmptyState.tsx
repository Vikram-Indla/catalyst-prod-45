/**
 * StarredEmptyState — the For You "Starred" tab empty state.
 *
 * Replaces the generic single-CTA placeholder (design-critique 2026-06-18,
 * score: 5 P1s). The old state lied about scope ("Star a work item…" when the
 * model also stars filters/boards/dashboards/products), floated on a void with
 * ~70% dead space, and offered one dead-endish button with no payoff preview.
 *
 * This state is a teaching surface bound to the unified star model:
 *   1. Bounded card (no floating-on-white-void).
 *   2. Scope-honest copy naming every starrable category.
 *   3. Four category tiles → teaches the taxonomy (recognition over recall).
 *   4. Faded ghost preview → shows the payoff (Cooper goal-directed pull).
 *   5. Multiple live entry points (assigned tab · board tab · recent filters).
 *   6. Affordance hint → teaches the star-with-badge glyph.
 *
 * Reuses ADS tokens throughout — no raw hex outside var() fallbacks
 * (CLAUDE.md hardcoded-colour ban).
 */
import React from 'react';
import {
  Star, Search, Plus, ArrowRight,
  ListTodo, LayoutDashboard, Filter, Kanban,
  Zap, Box, FileText, Bug,
} from '@/lib/atlaskit-icons';

interface StarredEmptyStateProps {
  /** Routes to the Assigned tab — where most starrable work items live. */
  onBrowseWork: () => void;
  /** Routes to the Board tab. */
  onOpenBoard: () => void;
  /**
   * Routes to the user's most-recent hub filters. Optional: omitted when the
   * user has no recent hub visit, so the CTA is never a dead link
   * (zero-assumption — no guessed project key).
   */
  onBrowseFilters?: () => void;
}

const STAR_GOLD = 'var(--ds-icon-warning, #E2B203)';
const BLUE_BG = 'var(--ds-background-information, #E9F2FE)';
const BLUE_FG = 'var(--ds-icon-information, #1868DB)';
const BLUE_TXT = 'var(--ds-text-information, #0055CC)';
const PURPLE_BG = 'var(--ds-background-accent-purple-subtler, #F3F0FF)';
const PURPLE_FG = 'var(--ds-icon-accent-purple, #5E4DB2)';
const GREEN_BG = 'var(--ds-background-accent-green-subtler, #DCFFF1)';
const GREEN_FG = 'var(--ds-icon-accent-green, #216E4E)';
const ORANGE_BG = 'var(--ds-background-accent-orange-subtler, #FFF3D6)';
const ORANGE_FG = 'var(--ds-icon-accent-orange, #974F0C)';
const RED_BG = 'var(--ds-background-accent-red-subtler, #FFECEB)';
const RED_FG = 'var(--ds-icon-accent-red, #AE2E24)';

const SURFACE = 'var(--ds-surface, #FFFFFF)';
const SUNKEN = 'var(--ds-surface-sunken, #F7F8F9)';
const BORDER = 'var(--ds-border, #DFE1E6)';
const TEXT = 'var(--ds-text, #172B4D)';
const TEXT_SUBTLE = 'var(--ds-text-subtle, #44546F)';
const TEXT_SUBTLEST = 'var(--ds-text-subtlest, #626F86)';
const BODY_FONT = 'var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif';

function Tile({ bg, fg, icon, label, hint }: { bg: string; fg: string; icon: React.ReactNode; label: string; hint: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: `1px solid ${BORDER}`, borderRadius: 8 }}>
      <span style={{ width: 28, height: 28, borderRadius: 6, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: TEXT, fontFamily: BODY_FONT }}>{label}</p>
        <p style={{ margin: 0, fontSize: 'var(--ds-font-size-100)', color: TEXT_SUBTLEST, fontFamily: BODY_FONT }}>{hint}</p>
      </div>
    </div>
  );
}

function GhostRow({ bg, fg, icon, badge, badgeBg, badgeTxt, w1, w2 }: { bg: string; fg: string; icon: React.ReactNode; badge: string; badgeBg: string; badgeTxt: string; w1: number; w2: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px' }}>
      <span style={{ width: 28, height: 28, borderRadius: 6, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ width: w1, height: 9, borderRadius: 4, background: SUNKEN }} />
        <div style={{ width: w2, height: 7, borderRadius: 4, background: SUNKEN, marginTop: 4 }} />
      </div>
      <span style={{ fontSize: 'var(--ds-font-size-50)', padding: '4px 8px', borderRadius: 6, background: badgeBg, color: badgeTxt, fontFamily: BODY_FONT }}>{badge}</span>
      <Star size={14} color={STAR_GOLD} fill={STAR_GOLD} />
    </div>
  );
}

export function StarredEmptyState({ onBrowseWork, onOpenBoard, onBrowseFilters }: StarredEmptyStateProps) {
  const ctaBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 6, fontSize: 'var(--ds-font-size-300)', fontWeight: 500,
    cursor: 'pointer', fontFamily: BODY_FONT,
  };

  return (
    <div style={{ padding: '32px 16px', background: SUNKEN, display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: 560, width: '100%', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '32px 24px' }}>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <span style={{ position: 'relative', width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Star size={38} color={STAR_GOLD} fill={STAR_GOLD} />
            <span style={{ position: 'absolute', bottom: 0, right: -2, width: 20, height: 20, borderRadius: '50%', background: BLUE_FG, border: `2px solid ${SURFACE}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={11} color="var(--ds-text-inverse, #FFFFFF)" />
            </span>
          </span>
          <p style={{ margin: 0, fontSize: 'var(--ds-font-size-600)', fontWeight: 500, color: TEXT, fontFamily: BODY_FONT }}>Build your starred shortcuts</p>
          <p data-testid="starred-empty-description" style={{ margin: '8px 0 0', fontSize: 'var(--ds-font-size-400)', color: TEXT_SUBTLE, lineHeight: 1.5, maxWidth: 420, fontFamily: BODY_FONT }}>
            Star anything you return to often — boards, backlogs, filters, dashboards, products, or work items. It lands here and pins to your sidebar.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8, margin: '24px 0 4px' }}>
          <Tile bg={BLUE_BG} fg={BLUE_FG} icon={<Kanban size={15} />} label="Surfaces" hint="Board · Backlog · Filter" />
          <Tile bg={PURPLE_BG} fg={PURPLE_FG} icon={<Zap size={15} />} label="Work items" hint="Epic · Story · Bug" />
          <Tile bg={GREEN_BG} fg={GREEN_FG} icon={<Box size={15} />} label="Containers" hint="Project · Product" />
          <Tile bg={ORANGE_BG} fg={ORANGE_FG} icon={<FileText size={15} />} label="Knowledge" hint="Doc · Theme · Objective" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 8px' }}>
          <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 500, letterSpacing: 0.4, color: TEXT_SUBTLEST, fontFamily: BODY_FONT }}>PREVIEW</span>
          <span style={{ flex: 1, height: 1, background: BORDER }} />
        </div>

        <div style={{ opacity: 0.55 }} aria-hidden="true">
          <GhostRow bg={BLUE_BG} fg={BLUE_FG} icon={<ListTodo size={15} />} badge="Backlog" badgeBg={BLUE_BG} badgeTxt={BLUE_TXT} w1={130} w2={80} />
          <GhostRow bg={RED_BG} fg={RED_FG} icon={<Bug size={15} />} badge="QA Bug" badgeBg={RED_BG} badgeTxt={RED_FG} w1={160} w2={60} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
          <button type="button" onClick={onBrowseWork} style={{ ...ctaBase, flex: 1, background: 'var(--ds-background-brand-bold, #0C66E4)', color: 'var(--ds-text-inverse, #FFFFFF)', border: 'none' }}>
            <Search size={15} />Browse work to star
          </button>
          <button type="button" onClick={onOpenBoard} style={{ ...ctaBase, background: 'transparent', color: TEXT, border: `1px solid ${BORDER}` }}>
            <LayoutDashboard size={15} />Open a board
          </button>
          {onBrowseFilters && (
            <button type="button" onClick={onBrowseFilters} style={{ ...ctaBase, background: 'transparent', color: TEXT, border: `1px solid ${BORDER}` }}>
              <Filter size={15} />Filters
            </button>
          )}
        </div>

        <p style={{ margin: '16px 0 0', fontSize: 'var(--ds-font-size-200)', color: TEXT_SUBTLEST, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: BODY_FONT }}>
          Look for the <Star size={13} color={STAR_GOLD} /> on any board, backlog, filter, or work item
        </p>

      </div>
    </div>
  );
}
