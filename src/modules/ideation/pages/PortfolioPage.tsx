/**
 * Ideation · Portfolio — Value × Effort field chart (D4 default axes).
 *
 * Phase 2 S5: real scatter over idn_idea_scores for the active ('default-v1')
 * model's value/effort drivers. Quadrant labels are verbatim from design
 * 04 §C.7's mock (Quick Wins/Big Bets/Fill-ins/Money Pit) — the mock's ASCII
 * layout put Quick Wins/Money Pit on the opposite side from the conventional
 * reading of "Effort ▶" increasing rightward; this build uses the
 * industry-standard mapping (high value + low effort = Quick Win, top-left)
 * since that's the meaning "Quick Win" carries everywhere else in the design
 * pack and evidence (05 §C row 7) — flagged here for confirmation, not
 * silently guessed. Empty-state coaching text adopted from Mobbin evidence
 * 05 §C row 7 (TheyDo blank-matrix coaching).
 * Phase 2 S2: hosts the ?create=idea deep link (D6) via CreateIdeaModal.
 */
import { useMemo } from 'react';
import Button from '@atlaskit/button/new';
import { useNavigate } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
import { token } from '@atlaskit/tokens';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { HubPageHeader } from '@/components/layout/HubPageHeader';
import { EmptyState } from '@/components/ads/EmptyState';
import { Routes } from '@/lib/routes';
import { CreateIdeaModal } from '@/modules/ideation/components/CreateIdeaModal';
import { useCreateIdeaParam } from '@/modules/ideation/hooks/useCreateIdeaParam';
import { useIdeationPortfolio } from '@/hooks/useIdeationPortfolio';
import type { IdeaClass, PortfolioPoint } from '@/modules/ideation/types';

const CLASS_COLOR: Record<IdeaClass, string> = {
  problem: token('color.background.danger.bold', 'var(--ds-background-danger-bold)'),
  opportunity: token('color.background.success.bold', 'var(--ds-background-success-bold)'),
  improvement: token('color.background.information.bold', 'var(--ds-background-information-bold)'),
};

const CLASS_LABEL: Record<IdeaClass, string> = {
  problem: 'Problem',
  opportunity: 'Opportunity',
  improvement: 'Improvement',
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: PortfolioPoint }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div
      style={{
        background: token('color.surface.raised', 'var(--ds-surface-raised)'),
        border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
        borderRadius: 4,
        padding: '8px 12px',
        boxShadow: token('elevation.shadow.overlay', 'var(--ds-shadow-overlay)'),
        font: '400 13px/18px var(--ds-font-family-body, "Atlassian Sans")',
        color: token('color.text', 'var(--ds-text)'),
      }}
    >
      <div style={{ fontWeight: 600 }}>{p.idea_key} · {p.title}</div>
      <div style={{ color: token('color.text.subtle', 'var(--ds-text-subtle)') }}>
        Value {p.value} · Effort {p.effort}
      </div>
    </div>
  );
}

/**
 * Custom point shape — recharts' default Scatter symbol renders an empty
 * `d="M0,0"` path when colored via <Cell> children in this recharts version
 * (confirmed via DOM inspection: 5 <g class="recharts-scatter-symbol"> exist
 * but their <path> geometry is degenerate). EpicBalancingChart hit the same
 * issue and works around it with an explicit shape function — same fix here.
 */
function PortfolioDot(props: {
  cx?: number;
  cy?: number;
  payload?: PortfolioPoint;
  onNavigate: (slug: string) => void;
}) {
  const { cx, cy, payload, onNavigate } = props;
  if (cx == null || cy == null || !payload) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={7}
      fill={CLASS_COLOR[payload.idea_class]}
      fillOpacity={0.85}
      stroke={token('color.surface', 'var(--ds-surface)')}
      strokeWidth={1.5}
      style={{ cursor: 'pointer' }}
      onClick={() => onNavigate(payload.slug)}
    />
  );
}

export default function PortfolioPage() {
  const navigate = useNavigate();
  const createModal = useCreateIdeaParam();
  const { data, isLoading, isError } = useIdeationPortfolio();

  const chartData = useMemo(
    () => (data?.scored ?? []).map((p) => ({ ...p, x: p.effort, y: p.value })),
    [data]
  );
  const scaleMax = data?.scaleMax ?? 5;
  const mid = scaleMax / 2;

  if (isLoading) {
    return (
      <div data-testid="ideation-portfolio-page" style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (isError) {
    return (
      <div data-testid="ideation-portfolio-page">
        <HubPageHeader title="Portfolio" />
        <EmptyState header="Couldn't load the Portfolio" description="There was a problem reading scored ideas. Try again shortly." testId="ideation-portfolio-error" />
      </div>
    );
  }

  const hasScored = (data?.scored.length ?? 0) > 0;

  return (
    <div data-testid="ideation-portfolio-page">
      <HubPageHeader title="Portfolio" />

      {!hasScored ? (
        <>
          {/* TheyDo blank-matrix coaching (05 §C row 7) */}
          <EmptyState
            header="Nothing to plot yet"
            description="Add Value and Effort scores to place ideas on the matrix. Ideas gain scores during evaluation."
            primaryAction={
              <Button appearance="primary" onClick={() => navigate(Routes.ideation.explore())}>
                Explore ideas
              </Button>
            }
            testId="ideation-portfolio-empty"
          />
        </>
      ) : (
        <div style={{ padding: '0 16px 24px' }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            {(Object.keys(CLASS_LABEL) as IdeaClass[]).map((c) => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: CLASS_COLOR[c], display: 'inline-block' }} />
                <span style={{ font: '400 12px/16px var(--ds-font-family-body, "Atlassian Sans")', color: token('color.text.subtle', 'var(--ds-text-subtle)') }}>
                  {CLASS_LABEL[c]}
                </span>
              </div>
            ))}
          </div>

          <div style={{ height: 440 }} data-testid="ideation-portfolio-chart">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 16, right: 24, bottom: 32, left: 16 }}>
                <CartesianGrid stroke={token('color.border', 'var(--ds-border)')} strokeDasharray="3 3" />

                <XAxis
                  type="number"
                  dataKey="x"
                  name="Effort"
                  domain={[0, scaleMax]}
                  tick={{ fill: token('color.text.subtle', 'var(--ds-text-subtle)'), fontSize: 12 }}
                  axisLine={{ stroke: token('color.border', 'var(--ds-border)') }}
                  label={{ value: 'Effort →', position: 'insideBottomRight', offset: -8, style: { fill: token('color.text.subtle', 'var(--ds-text-subtle)'), fontSize: 12 } }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Value"
                  domain={[0, scaleMax]}
                  tick={{ fill: token('color.text.subtle', 'var(--ds-text-subtle)'), fontSize: 12 }}
                  axisLine={{ stroke: token('color.border', 'var(--ds-border)') }}
                  label={{ value: 'Value →', angle: -90, position: 'insideTopLeft', offset: -4, style: { fill: token('color.text.subtle', 'var(--ds-text-subtle)'), fontSize: 12 } }}
                />

                <ReferenceArea x1={0} x2={mid} y1={mid} y2={scaleMax} fill="transparent" label={{ value: 'Quick Wins', position: 'insideTopLeft', style: { fill: token('color.text.subtlest', 'var(--ds-text-subtlest)'), fontSize: 12, fontWeight: 600 } }} />
                <ReferenceArea x1={mid} x2={scaleMax} y1={mid} y2={scaleMax} fill="transparent" label={{ value: 'Big Bets', position: 'insideTopRight', style: { fill: token('color.text.subtlest', 'var(--ds-text-subtlest)'), fontSize: 12, fontWeight: 600 } }} />
                <ReferenceArea x1={0} x2={mid} y1={0} y2={mid} fill="transparent" label={{ value: 'Fill-ins', position: 'insideBottomLeft', style: { fill: token('color.text.subtlest', 'var(--ds-text-subtlest)'), fontSize: 12, fontWeight: 600 } }} />
                <ReferenceArea x1={mid} x2={scaleMax} y1={0} y2={mid} fill="transparent" label={{ value: 'Money Pit', position: 'insideBottomRight', style: { fill: token('color.text.subtlest', 'var(--ds-text-subtlest)'), fontSize: 12, fontWeight: 600 } }} />

                <ReferenceLine x={mid} stroke={token('color.border', 'var(--ds-border)')} strokeDasharray="5 5" />
                <ReferenceLine y={mid} stroke={token('color.border', 'var(--ds-border)')} strokeDasharray="5 5" />

                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

                <Scatter
                  data={chartData}
                  shape={(props: object) => (
                    <PortfolioDot {...props} onNavigate={(slug) => navigate(Routes.ideation.idea(slug))} />
                  )}
                  isAnimationActive={false}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {(data?.unscored.length ?? 0) > 0 && (
            <div
              style={{
                marginTop: 16,
                padding: '12px 16px',
                background: token('color.background.neutral', 'var(--ds-background-neutral)'),
                borderRadius: 4,
              }}
              data-testid="ideation-portfolio-unscored-tray"
            >
              <div style={{ font: '600 12px/16px var(--ds-font-family-body, "Atlassian Sans")', color: token('color.text.subtle', 'var(--ds-text-subtle)'), marginBottom: 6 }}>
                Needs scoring: {data?.unscored.length}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(data?.unscored ?? []).map((idea) => (
                  <button
                    key={idea.id}
                    type="button"
                    onClick={() => navigate(Routes.ideation.idea(idea.slug))}
                    style={{
                      font: '400 12px/16px var(--ds-font-family-body, "Atlassian Sans")',
                      color: token('color.text.subtle', 'var(--ds-text-subtle)'),
                      background: 'none',
                      border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
                      borderRadius: 4,
                      padding: '4px 8px',
                      cursor: 'pointer',
                    }}
                  >
                    {idea.idea_key} · {idea.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <CreateIdeaModal isOpen={createModal.isOpen} onClose={createModal.close} />
    </div>
  );
}
