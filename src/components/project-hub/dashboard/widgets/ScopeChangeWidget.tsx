// @ts-nocheck
/**
 * ScopeChangeWidget — original vs added-after-start scope per release.
 *
 * Rebuilt Apr 25, 2026 per ScopeChangeGadget spec (Forge G7 brief).
 *   - Atlaskit primitives (Heading, Text, Inline, Stack, Box, Lozenge) only.
 *   - Dual-segment bar (two Box children — Atlaskit progress-bar is single-value).
 *   - Settings persisted via useGadgetSettings('scope') → GadgetSettingsPanel.
 *   - Date filter applied inside useDashboardScopeChange against the canonical
 *     ph_versions.start_date (target_date − 14d fallback).
 *   - Row click → openUWV() with release-scoped filter context (no nav).
 *
 * Two scope-bar fills remain as scoped literal rgba — Atlaskit tokens don't
 * expose a "scope-delta" semantic fill. Documented + sandboxed to this widget.
 */
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardScopeChange } from '@/hooks/useDashboardWidgets';
import { useGadgetSettings } from '@/hooks/useGadgetSettings';
import { token } from '@atlaskit/tokens';
import { useUWV } from '@/components/universal-work-view/UWVContext';
import { EmptyState, Lozenge } from '@/components/ads';
import Heading from '@atlaskit/heading';
import { Box, Inline, Stack, Text, Pressable, xcss } from '@atlaskit/primitives';
import WidgetGearButton from '../WidgetGearButton';

/** Scope-bar palette — scoped to this widget. See file header. */
const SCOPE_ORIG  = 'rgba(37, 99, 235, 0.55)';   // original scope (blue)
const SCOPE_ADDED = 'rgba(220, 38, 38, 0.65)';   // added after start (red)

/** Format YYYY-MM-DD → "DD Mon YY" (no Date timezone surprises) */
function formatEndDate(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d).padStart(2, '0')} ${monthNames[m - 1]} ${String(y).slice(2)}`;
}

const rowPressableStyle = xcss({
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: 'space.150',
  borderRadius: 'border.radius.100',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
  backgroundColor: 'color.background.input',
  marginBlockEnd: 'space.100',
  cursor: 'pointer',
  ':hover': {
    backgroundColor: 'color.background.input.hovered',
    borderColor: 'color.border.bold',
  },
});

const statCardStyle = xcss({
  flex: '1 1 0',
  minWidth: '0',
  padding: 'space.150',
  borderRadius: 'border.radius.100',
  backgroundColor: 'color.background.neutral',
});

export default function ScopeChangeWidget({
  projectId, projectKey, collapsed, onToggleCollapse,
}: WidgetProps) {
  const { settings } = useGadgetSettings('scope', projectKey);
  const { openUWV }  = useUWV();

  // Resolve config (with defaults from spec)
  const maxReleases     = settings.gadgetSpecific?.maxReleases     ?? 8;
  const thresholdHigh   = settings.gadgetSpecific?.thresholdHigh   ?? 80;
  const thresholdMod    = settings.gadgetSpecific?.thresholdModerate ?? 30;
  const showOnlyActive  = settings.gadgetSpecific?.showOnlyActive  ?? true;

  const { data: scopes = [], isLoading } = useDashboardScopeChange(projectId, {
    dateFrom: settings.dateFrom,
    dateTo:   settings.dateTo,
    statusFilter:   settings.statusFilter,
    releaseFilter:  settings.releaseFilter,
    assigneeFilter: settings.assigneeFilter,
    itemTypeFilter: settings.itemTypeFilter,
    priorityFilter: settings.priorityFilter,
    showOnlyActive,
  });

  // Sort: 0% creep first, then ascending by deltaPercent. Cap by maxReleases.
  const sorted = [...scopes]
    .sort((a, b) => a.deltaPercent - b.deltaPercent)
    .slice(0, maxReleases);

  const releasesShown    = sorted.length;
  const highCreepCount   = sorted.filter(s => s.deltaPercent > thresholdHigh).length;
  const plannedCorrectly = sorted.filter(s => s.deltaPercent === 0).length;

  const handleReleaseClick = (s: typeof sorted[number]) => {
    openUWV({
      project:    projectKey,
      hubSource:  ['releasehub', 'projecthub'],
      title:      `Scope change — ${s.releaseName} · ${formatEndDate(s.endDate)}`,
      scope:      'all',
      dateFrom:   settings.dateFrom ?? null,
      dateTo:     settings.dateTo   ?? null,
      dateLabel:  settings.dateLabel,
      // Scope this UWV view to items in the clicked release
      releaseFilter:  [s.releaseName],
      statusFilter:   settings.statusFilter,
      assigneeFilter: settings.assigneeFilter,
      itemTypeFilter: settings.itemTypeFilter,
      priorityFilter: settings.priorityFilter,
    });
  };

  return (
    <WidgetWrapper
      title="Scope Change"
      subtitle="Items added after release start"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      span={1}
      headerBadges={
        <WidgetGearButton gadgetType="scope" projectKey={projectKey} projectId={projectId} />
      }
    >
      <Stack space="space.150">
        {/* Description + methodology */}
        <Stack space="space.050">
          <Text size="small" color="color.text.subtle">
            How much work was added to each release after it started. High scope
            change means the release was not fully planned at kickoff — or
            priorities shifted mid-flight.
          </Text>
          <Text size="UNSAFE_small" color="color.text.disabled">
            Counts issues where the release was assigned after the release start date.
          </Text>
        </Stack>

        {isLoading ? (
          <Box
            padding="space.200"
            backgroundColor="color.background.neutral.subtle"
            xcss={xcss({ borderRadius: 'border.radius.100', minHeight: '48px' })}
          />
        ) : sorted.length === 0 ? (
          <EmptyState
            size="compact"
            header="No releases match"
            description="No releases match the current filters."
          />
        ) : (
          <>
            {/* Summary stat row */}
            <Inline space="space.150" shouldWrap>
              <Box xcss={statCardStyle}>
                <Stack space="space.050">
                  <Text size="UNSAFE_small" color="color.text.subtle">Releases shown</Text>
                  <Heading size="medium">{releasesShown}</Heading>
                </Stack>
              </Box>
              <Box xcss={statCardStyle}>
                <Stack space="space.050">
                  <Text size="UNSAFE_small" color="color.text.subtle">
                    Added &gt;{thresholdHigh}% late
                  </Text>
                  <Text size="large" weight="semibold" color="color.text.danger">
                    {highCreepCount}
                  </Text>
                </Stack>
              </Box>
              <Box xcss={statCardStyle}>
                <Stack space="space.050">
                  <Text size="UNSAFE_small" color="color.text.subtle">Planned correctly</Text>
                  <Text size="large" weight="semibold" color="color.text.success">
                    {plannedCorrectly}
                  </Text>
                </Stack>
              </Box>
            </Inline>

            {/* Release rows */}
            <Box>
              {sorted.map((s) => {
                const total      = s.originalCount + s.addedCount;
                const origWidth  = total === 0 ? 100 : Math.round((s.originalCount / total) * 100);
                const addedWidth = total === 0 ? 0   : 100 - origWidth;

                let lozengeAppearance: 'success' | 'moved' | 'removed' = 'success';
                let lozengeLabel = 'No creep';
                if (s.deltaPercent > thresholdHigh) {
                  lozengeAppearance = 'removed';
                  lozengeLabel = 'High creep';
                } else if (s.deltaPercent > thresholdMod) {
                  lozengeAppearance = 'moved';
                  lozengeLabel = 'Moderate creep';
                } else if (s.deltaPercent > 0) {
                  lozengeAppearance = 'moved';
                  lozengeLabel = 'Moderate creep';
                }

                return (
                  <Pressable
                    key={s.releaseId}
                    xcss={rowPressableStyle}
                    onClick={() => handleReleaseClick(s)}
                    aria-label={`Open scope items for ${s.releaseName}`}
                  >
                    <Stack space="space.075">
                      {/* Top row */}
                      <Inline spread="space-between" alignBlock="center" space="space.100">
                        <Text weight="semibold" size="small" color="color.text">
                          {s.releaseName} · {formatEndDate(s.endDate)}
                        </Text>
                        <Inline space="space.100" alignBlock="center">
                          <Text size="UNSAFE_small" color="color.text.subtle">
                            {s.originalCount} original · {s.addedCount} added
                          </Text>
                          <Lozenge appearance={lozengeAppearance}>{lozengeLabel}</Lozenge>
                        </Inline>
                      </Inline>

                      {/* Dual-segment bar */}
                      <div
                        style={{
                          display: 'flex',
                          height: 6,
                          borderRadius: 3,
                          overflow: 'hidden',
                          background: token('color.background.neutral', '#F1F2F4'),
                        }}
                      >
                        {origWidth > 0 && (
                          <div style={{ width: `${origWidth}%`, background: SCOPE_ORIG }} />
                        )}
                        {addedWidth > 0 && (
                          <div style={{ width: `${addedWidth}%`, background: SCOPE_ADDED }} />
                        )}
                      </div>

                      {/* Bar labels */}
                      <Inline spread="space-between" alignBlock="center">
                        <Text size="UNSAFE_small" color="color.text.disabled">
                          Original scope
                        </Text>
                        <Text size="UNSAFE_small" color="color.text.disabled">
                          {s.deltaPercent > 0
                            ? `+${s.deltaPercent}% added after start`
                            : '0% added after start'}
                        </Text>
                      </Inline>
                    </Stack>
                  </Pressable>
                );
              })}
            </Box>

            {/* Legend */}
            <Inline space="space.200" alignBlock="center">
              <Inline space="space.075" alignBlock="center">
                <span
                  aria-hidden
                  style={{
                    display: 'inline-block', width: 10, height: 10,
                    borderRadius: 2, background: SCOPE_ORIG,
                  }}
                />
                <Text size="UNSAFE_small" color="color.text.subtle">
                  Original scope (planned before start)
                </Text>
              </Inline>
              <Inline space="space.075" alignBlock="center">
                <span
                  aria-hidden
                  style={{
                    display: 'inline-block', width: 10, height: 10,
                    borderRadius: 2, background: SCOPE_ADDED,
                  }}
                />
                <Text size="UNSAFE_small" color="color.text.subtle">
                  Added after start
                </Text>
              </Inline>
            </Inline>
          </>
        )}
      </Stack>
    </WidgetWrapper>
  );
}
