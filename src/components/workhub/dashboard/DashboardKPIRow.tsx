/**
 * DashboardKPIRow — 5 KPI cards for the dashboard
 * Phase 8
 */
import { useNavigate } from 'react-router-dom';
import { Rocket, AlertTriangle, FileStack, Clock, AlertCircle } from 'lucide-react';
import type { DashboardKPIs } from '@/types/workhub.types';

interface KPICardDef {
  label: string;
  subLabel?: string;
  getValue: (k: DashboardKPIs) => number;
  getSubtext?: (k: DashboardKPIs) => string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  getValueColor?: (k: DashboardKPIs) => string | undefined;
  getDangerBorder?: (k: DashboardKPIs) => boolean;
  path: string;
}

const KPI_CARDS: KPICardDef[] = [
  {
    label: 'Active Releases',
    getValue: k => k.active_releases,
    icon: Rocket,
    iconBg: '#dbeafe',
    iconColor: 'var(--cp-blue)',
    path: '/projecthub/releases',
  },
  {
    label: 'At Risk',
    getValue: k => k.at_risk_releases,
    icon: AlertTriangle,
    iconBg: '#fee2e2',
    iconColor: 'var(--sem-danger)',
    getValueColor: k => k.at_risk_releases > 0 ? 'var(--sem-danger)' : 'var(--sem-success)',
    path: '/projecthub/releases',
  },
  {
    label: 'Total Items',
    getValue: k => k.total_work_items,
    getSubtext: k => `${k.done_work_items} done`,
    icon: FileStack,
    iconBg: '#f0fdf4',
    iconColor: 'var(--sem-success)',
    path: '/projecthub/workitems',
  },
  {
    label: 'Due This Week',
    getValue: k => k.due_this_week,
    icon: Clock,
    iconBg: '#fefce8',
    iconColor: 'var(--sem-warning)',
    getValueColor: k => k.due_this_week > 0 ? 'var(--sem-warning)' : undefined,
    path: '/projecthub/workitems',
  },
  {
    label: 'Overdue Items',
    getValue: k => k.overdue_items,
    icon: AlertCircle,
    iconBg: '#fee2e2',
    iconColor: 'var(--sem-danger)',
    getValueColor: k => k.overdue_items > 0 ? 'var(--sem-danger)' : undefined,
    getDangerBorder: k => k.overdue_items > 0,
    path: '/projecthub/workitems',
  },
];

interface DashboardKPIRowProps {
  kpis: DashboardKPIs | null | undefined;
  isLoading: boolean;
}

export function DashboardKPIRow({ kpis, isLoading }: DashboardKPIRowProps) {
  const navigate = useNavigate();

  if (isLoading || !kpis) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 16,
      }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: 'var(--cp-float)',
              border: '1px solid var(--divider)',
              borderRadius: 'var(--wh-radius-xl, 16px)',
              padding: 20,
              height: 120,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 16,
    }} className="max-[900px]:grid-cols-3 max-[600px]:grid-cols-2">
      {KPI_CARDS.map(card => {
        const value = card.getValue(kpis);
        const subtext = card.getSubtext?.(kpis);
        const valueColor = card.getValueColor?.(kpis) || 'var(--fg-1)';
        const dangerBorder = card.getDangerBorder?.(kpis);
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            onClick={() => navigate(card.path)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && navigate(card.path)}
            style={{
              background: 'var(--cp-float)',
              border: '1px solid var(--divider)',
              borderLeft: dangerBorder ? '4px solid #ef4444' : '1px solid var(--divider)',
              borderRadius: 'var(--wh-radius-xl, 16px)',
              padding: 20,
              boxShadow: 'var(--wh-shadow-sm, 0 1px 3px rgba(0,0,0,0.06))',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            className="hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            {/* Icon circle */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: card.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Icon style={{ width: 20, height: 20, color: card.iconColor }} />
            </div>

            {/* Value */}
            <div style={{
              fontFamily: 'var(--cp-font-heading)',
              fontSize: 28,
              fontWeight: 700,
              color: valueColor,
              lineHeight: 1.1,
            }}>
              {value}
            </div>

            {/* Label */}
            <div style={{
              fontFamily: 'var(--cp-font-body)',
              fontSize: 12,
              fontWeight: 500,
              textTransform: 'uppercase' as const,
              color: 'var(--fg-4)',
              marginTop: 4,
              letterSpacing: '0.03em',
            }}>
              {card.label}
            </div>

            {/* Subtext */}
            {subtext && (
              <div style={{
                fontFamily: 'var(--cp-font-body)',
                fontSize: 11,
                color: 'var(--fg-3)',
                marginTop: 2,
              }}>
                {subtext}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
