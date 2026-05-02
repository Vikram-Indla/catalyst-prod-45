/**
 * ProductScopedPageHeader — Phase 5 (2026-05-02).
 *
 * Renders Project Hub-style per-project chrome scoped to a Product Hub
 * product:
 *   1. Title (Product name)
 *   2. Stat cards row (Total Items / Completed / In Progress / Overdue /
 *      AI Features)
 *   3. View tabs (Backlog / Board / Timeline) — these are RouterLink-style
 *      navigation, so each tab is a separate URL: /product-hub/{CODE}/backlog,
 *      /product-hub/{CODE}/boards, /product-hub/{CODE}/timeline. Differs
 *      from Project Hub's local-state activeView pattern because the
 *      Product Hub routes already exist and we want middle-click +
 *      Cmd-click to open in new tab.
 *
 * Mounting: any per-product page renders <ProductScopedPageHeader
 *   product={product} activeView={...} stats={...} /> at the top.
 *
 * Props use the canonical product shape from public.products. Stats are
 * passed in by the parent (different pages compute different counts).
 */

import { Link as RouterLink } from 'react-router-dom';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  Kanban,
  Columns3,
  GanttChart,
  Network,
} from 'lucide-react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';

export interface ProductScopedHeaderProduct {
  code: string;
  name: string;
  color?: string | null;
}

export interface ProductScopedHeaderStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  /** Optional — string so caller can format e.g. "0%" */
  aiFeatures?: string;
}

type ViewKey = 'backlog' | 'boards' | 'allwork' | 'roadmap' | 'cards';

interface Props {
  product: ProductScopedHeaderProduct;
  activeView: ViewKey;
  stats: ProductScopedHeaderStats;
}

const VIEWS: { key: ViewKey; label: string; icon: typeof Columns3 }[] = [
  { key: 'backlog',  label: 'Backlog',  icon: Kanban },
  { key: 'boards',   label: 'Board',    icon: Columns3 },
  { key: 'allwork',  label: 'All Work', icon: Network },
  { key: 'roadmap',  label: 'Timeline', icon: GanttChart },
];

export function ProductScopedPageHeader({ product, activeView, stats }: Props) {
  const overdueDanger = stats.overdue > 0;

  const statCards = [
    {
      label: 'Total Items',
      value: stats.total,
      icon: BarChart3,
      color: 'var(--ds-text-brand, #2563EB)',
      bg: 'var(--ds-background-selected, #EFF6FF)',
      accent: '',
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: CheckCircle2,
      color: 'var(--ds-text-success, #16A34A)',
      bg: 'var(--ds-background-success, #DCFCE7)',
      accent: '',
    },
    {
      label: 'In Progress',
      value: stats.inProgress,
      icon: Clock,
      color: 'var(--ds-text-brand, #2563EB)',
      bg: 'var(--ds-background-selected, #EFF6FF)',
      accent: '',
    },
    {
      label: 'Overdue',
      value: stats.overdue,
      icon: AlertTriangle,
      color: overdueDanger ? 'var(--ds-text-danger, #EF4444)' : 'var(--ds-text-subtlest, #94A3B8)',
      bg: overdueDanger ? 'var(--ds-background-danger, #FEF2F2)' : 'var(--ds-surface-sunken, #F1F5F9)',
      accent: '',
    },
    {
      label: 'AI Features',
      value: stats.aiFeatures ?? '0%',
      icon: Sparkles,
      color: '#7C3AED',
      bg: '#F5F3FF',
      accent: '#7C3AED',
    },
  ];

  return (
    <div style={{ fontFamily: 'var(--cp-font-body)' }}>
      <CatalystPageHeader title={product.name} />

      {/* Stat cards row */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: 'repeat(5, 1fr)',
          margin: '16px 0 14px',
        }}
      >
        {statCards.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3"
            style={{
              background: 'var(--cp-bg-elevated)',
              borderRadius: 12,
              padding: '12px 16px',
              border: '1px solid var(--cp-border-default)',
              borderLeft: s.accent ? `3px solid ${s.accent}` : '1px solid var(--cp-border-default)',
            }}
          >
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{ width: 36, height: 50, borderRadius: 8, background: s.bg }}
            >
              <s.icon size={18} color={s.color} strokeWidth={1.75} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--cp-text-primary)',
                  fontFamily: 'var(--cp-font-mono)',
                  lineHeight: 1.1,
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--cp-text-tertiary)', marginTop: 1 }}>
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View switcher — RouterLinks so middle-click + Cmd-click open new tabs. */}
      <div
        className="flex items-center gap-0.5 p-1 rounded-lg"
        style={{ background: 'var(--cp-bg-sunken, #F1F5F9)', width: 'fit-content', marginBottom: 12 }}
        role="tablist"
        aria-label="Product views"
      >
        {VIEWS.map((v) => {
          const isActive = activeView === v.key;
          return (
            <RouterLink
              key={v.key}
              to={`/product-hub/${product.code}/${v.key}`}
              role="tab"
              aria-selected={isActive}
              className="flex items-center gap-1.5"
              style={{
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: isActive ? 600 : 500,
                fontFamily: 'var(--cp-font-body)',
                borderRadius: 6,
                textDecoration: 'none',
                background: isActive ? 'var(--cp-bg-elevated)' : 'transparent',
                color: isActive ? 'var(--ds-text-brand, #2563EB)' : 'var(--cp-text-secondary)',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                transition: 'all 150ms ease',
              }}
            >
              <v.icon size={14} strokeWidth={1.75} />
              {v.label}
            </RouterLink>
          );
        })}
      </div>
    </div>
  );
}

export default ProductScopedPageHeader;
