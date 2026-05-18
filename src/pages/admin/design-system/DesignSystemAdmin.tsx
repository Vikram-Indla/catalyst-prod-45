import React, { useState, useEffect, useMemo } from 'react';
import Select from '@atlaskit/select';
import Button from '@atlaskit/button';
import Textfield from '@atlaskit/textfield';
import SearchIcon from '@atlaskit/icon/core/search';
import {
  getModuleViolations,
  getAuditHistory,
  runAudit,
  type Module,
  type Violation,
  type AuditTrail,
} from '@/lib/design-audit';

/* ── Jira admin tokens (probed live 2026-05-19) ──────────────────────
 * Source: https://digital-transformation.atlassian.net/jira/settings/issues/issue-types
 * H1: 24px / 653 / rgb(41,42,46) / Atlassian Sans / lineHeight 28px
 * Page subtitle: 14px / 400 / rgb(80,82,88)
 * Primary button: 14px / 500 / white text on rgb(24,104,219) / radius 3px / height 32
 * Filter input: 14px placeholder / height 28px
 * Table header: 12px / 653 / rgb(80,82,88) / sentence-case / borderBottom 1.67px solid rgba(11,18,14,0.14)
 * Table cell:   14px / 400 / rgb(41,42,46) / padding 4px 8px 4px 0
 * ────────────────────────────────────────────────────────────────── */

interface AuditMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

const MODULE_OPTIONS: { label: string; value: Module }[] = [
  { label: 'Project Hub', value: 'project-hub' },
  { label: 'Product Hub', value: 'product-hub' },
  { label: 'Incidents', value: 'incidents' },
  { label: 'Releases', value: 'releases' },
  { label: 'Reports', value: 'reports' },
  { label: 'Admin', value: 'admin' },
  { label: 'Resources', value: 'resources' },
];

const SURFACE_OPTIONS: Record<string, { label: string; value: string }[]> = {
  'project-hub': [
    { label: 'All surfaces', value: 'all' },
    { label: 'Backlog', value: 'backlog' },
    { label: 'Board', value: 'board' },
    { label: 'List view', value: 'list' },
  ],
  'product-hub': [
    { label: 'All surfaces', value: 'all' },
    { label: 'Product list', value: 'list' },
  ],
  incidents: [
    { label: 'All surfaces', value: 'all' },
    { label: 'Incidents list', value: 'list' },
  ],
  releases: [
    { label: 'All surfaces', value: 'all' },
    { label: 'Release calendar', value: 'calendar' },
  ],
  reports: [
    { label: 'All surfaces', value: 'all' },
    { label: 'Dashboard', value: 'dashboard' },
  ],
  admin: [
    { label: 'All surfaces', value: 'all' },
    { label: 'Users & access', value: 'users' },
  ],
  resources: [
    { label: 'All surfaces', value: 'all' },
    { label: 'Capacity', value: 'capacity' },
  ],
};

/* ── Severity badge — sentence case, Jira-style lozenge ──────────── */
function getSeverityBadgeStyle(severity: string): React.CSSProperties {
  const tone =
    severity === 'P0'
      ? { bg: 'var(--ds-background-danger, #FFECEB)', fg: 'var(--ds-text-danger, #AE2A19)' }
      : severity === 'P1'
        ? { bg: 'var(--ds-background-warning, #FFF7D6)', fg: 'var(--ds-text-warning-inverse, #533F04)' }
        : { bg: 'var(--ds-background-neutral, #DCDFE4)', fg: 'var(--ds-text-subtle, #44546F)' };
  return {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: 3,
    backgroundColor: tone.bg,
    color: tone.fg,
    fontSize: 11,
    fontWeight: 700,
    lineHeight: '16px',
    letterSpacing: '0.16px',
  };
}

export default function DesignSystemAdmin() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditTrail[]>([]);
  const [isLoadingViolations, setIsLoadingViolations] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedSurface, setSelectedSurface] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditMessage, setAuditMessage] = useState<AuditMessage | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  // Fetch violations and audit history when module changes.
  useEffect(() => {
    if (!selectedModule) {
      setViolations([]);
      setAuditTrail([]);
      return;
    }
    let cancelled = false;
    const fetchData = async () => {
      setIsLoadingViolations(true);
      try {
        const [violationData, trailData] = await Promise.all([
          getModuleViolations(selectedModule),
          getAuditHistory(selectedModule, 10),
        ]);
        if (cancelled) return;
        setViolations(violationData || []);
        setAuditTrail(trailData || []);
      } catch (error) {
        if (cancelled) return;
        console.error('Error fetching audit data:', error);
        setViolations([]);
        setAuditTrail([]);
      } finally {
        if (!cancelled) setIsLoadingViolations(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [selectedModule]);

  const handleRunAudit = async () => {
    if (!selectedModule) return;
    setIsAuditing(true);
    setAuditMessage(null);
    try {
      const result = await runAudit({
        module: selectedModule,
        surface: selectedSurface || undefined,
      });
      setAuditMessage({
        type: 'success',
        text: `Audit complete: ${result.violationCount} violations found, ${result.tokenCount} tokens analyzed.`,
      });
      const [violationData, trailData] = await Promise.all([
        getModuleViolations(selectedModule),
        getAuditHistory(selectedModule, 10),
      ]);
      setViolations(violationData || []);
      setAuditTrail(trailData || []);
    } catch (error) {
      setAuditMessage({
        type: 'error',
        text: `Audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsAuditing(false);
    }
  };

  /* ── Metrics ─────────────────────────────────────────────────── */
  const totalViolations = violations.length;
  const p0Violations = violations.filter(v => v.severity === 'P0').length;
  const p1Violations = violations.filter(v => v.severity === 'P1').length;
  const complianceScore =
    totalViolations === 0 ? 100 : Math.max(0, 100 - totalViolations * 10);

  /* ── Filter ──────────────────────────────────────────────────── */
  const visibleViolations = useMemo(() => {
    if (!filterQuery.trim()) return violations;
    const q = filterQuery.toLowerCase();
    return violations.filter(
      v =>
        v.rule_name.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.surface_id.toLowerCase().includes(q),
    );
  }, [violations, filterQuery]);

  const moduleOption = selectedModule
    ? MODULE_OPTIONS.find(o => o.value === selectedModule) ?? null
    : null;
  const surfaceOption =
    selectedModule && selectedSurface
      ? SURFACE_OPTIONS[selectedModule]?.find(o => o.value === selectedSurface) ?? null
      : null;

  return (
    <div
      style={{
        padding: '24px 32px 48px',
        maxWidth: 1280,
        color: 'rgb(41, 42, 46)',
        fontFamily:
          '"Atlassian Sans", ui-sans-serif, -apple-system, system-ui, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
      }}
    >
      {/* ─── Page header ─── Jira parity: H1 24/653 + subtitle + right-aligned primary button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 8,
        }}
      >
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 653,
              lineHeight: '28px',
              color: 'rgb(41, 42, 46)',
              margin: 0,
              letterSpacing: 'normal',
            }}
          >
            Design system
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button
            appearance="primary"
            onClick={handleRunAudit}
            isDisabled={!selectedModule || isAuditing}
          >
            {isAuditing ? 'Running audit…' : 'Run audit'}
          </Button>
        </div>
      </div>

      <p
        style={{
          fontSize: 14,
          fontWeight: 400,
          color: 'rgb(80, 82, 88)',
          margin: '0 0 24px 0',
          lineHeight: '20px',
          maxWidth: 760,
        }}
      >
        Track design system compliance across modules and surfaces. Select a module
        to load violations, then run an audit to refresh.
      </p>

      {/* ─── Module + Surface picker row ─── inline, no boxed panel */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-end',
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 240, flex: '0 1 280px' }}>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: 'rgb(80, 82, 88)',
              marginBottom: 4,
            }}
          >
            Module
          </label>
          <Select
            options={MODULE_OPTIONS}
            value={moduleOption}
            onChange={option => {
              setSelectedModule((option?.value as Module) || null);
              setSelectedSurface(null);
            }}
            placeholder="Select a module"
            isClearable
          />
        </div>

        {selectedModule && (
          <div style={{ minWidth: 240, flex: '0 1 280px' }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'rgb(80, 82, 88)',
                marginBottom: 4,
              }}
            >
              Surface
            </label>
            <Select
              options={SURFACE_OPTIONS[selectedModule] || []}
              value={surfaceOption}
              onChange={option => setSelectedSurface(option?.value || null)}
              placeholder="Select a surface"
              isClearable
            />
          </div>
        )}
      </div>

      {/* ─── Audit feedback message ─── Jira-style flat notification */}
      {auditMessage && (
        <div
          role="status"
          style={{
            padding: '8px 12px',
            marginBottom: 16,
            borderRadius: 3,
            fontSize: 13,
            lineHeight: '20px',
            background:
              auditMessage.type === 'success'
                ? 'var(--ds-background-success, #DCFFF1)'
                : auditMessage.type === 'error'
                  ? 'var(--ds-background-danger, #FFECEB)'
                  : 'var(--ds-background-information, #E9F2FF)',
            color:
              auditMessage.type === 'success'
                ? 'var(--ds-text-success, #216E4E)'
                : auditMessage.type === 'error'
                  ? 'var(--ds-text-danger, #AE2A19)'
                  : 'var(--ds-text-information, #0055CC)',
          }}
        >
          {auditMessage.text}
        </div>
      )}

      {/* ─── Compliance metric strip ─── compact horizontal cards, Jira-style */}
      {selectedModule && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 24,
            flexWrap: 'wrap',
          }}
        >
          {[
            {
              label: 'Compliance score',
              value: `${complianceScore}%`,
              valueColor:
                complianceScore >= 80
                  ? 'rgb(33, 110, 78)'
                  : complianceScore >= 50
                    ? 'rgb(133, 79, 4)'
                    : 'rgb(174, 42, 25)',
            },
            { label: 'Total violations', value: totalViolations },
            {
              label: 'P0 blockers',
              value: p0Violations,
              valueColor: p0Violations > 0 ? 'rgb(174, 42, 25)' : 'rgb(41, 42, 46)',
            },
            {
              label: 'P1 issues',
              value: p1Violations,
              valueColor: p1Violations > 0 ? 'rgb(133, 79, 4)' : 'rgb(41, 42, 46)',
            },
          ].map(card => (
            <div
              key={card.label}
              style={{
                flex: '1 1 180px',
                minWidth: 160,
                padding: '12px 16px',
                background: '#FFFFFF',
                border: '1px solid rgba(11, 18, 14, 0.14)',
                borderRadius: 3,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'rgb(80, 82, 88)',
                  marginBottom: 4,
                  letterSpacing: 'normal',
                }}
              >
                {card.label}
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 653,
                  lineHeight: '24px',
                  color: card.valueColor || 'rgb(41, 42, 46)',
                }}
              >
                {card.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Filter input ─── Jira's "Filter X by name or description" pattern */}
      {selectedModule && (
        <div style={{ maxWidth: 360, marginBottom: 12 }}>
          <Textfield
            placeholder="Filter violations by rule, description, or surface"
            value={filterQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFilterQuery(e.target.value)
            }
            elemBeforeInput={
              <div
                style={{
                  paddingLeft: 8,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <SearchIcon label="" size="small" />
              </div>
            }
            isCompact
          />
        </div>
      )}

      {/* ─── Violations table ─── Jira admin parity: 12/653 sentence-case headers, 14/400 cells, no outer border */}
      {isLoadingViolations ? (
        <div
          style={{
            padding: '32px 0',
            fontSize: 14,
            color: 'rgb(80, 82, 88)',
          }}
        >
          Loading violations…
        </div>
      ) : visibleViolations.length > 0 ? (
        <div style={{ marginBottom: 32 }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 14,
            }}
          >
            <thead>
              <tr>
                {[
                  { key: 'rule', label: 'Rule', width: '28%' },
                  { key: 'sev', label: 'Severity', width: '90px' },
                  { key: 'desc', label: 'Description', width: 'auto' },
                  { key: 'surface', label: 'Surface', width: '130px' },
                  { key: 'date', label: 'Created', width: '140px' },
                ].map(col => (
                  <th
                    key={col.key}
                    scope="col"
                    style={{
                      textAlign: 'left',
                      fontSize: 12,
                      fontWeight: 653,
                      color: 'rgb(80, 82, 88)',
                      padding: '8px 12px 8px 0',
                      borderBottom: '1.67px solid rgba(11, 18, 14, 0.14)',
                      textTransform: 'none',
                      letterSpacing: 'normal',
                      width: col.width,
                      lineHeight: '16px',
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleViolations.map(v => (
                <tr key={v.id}>
                  <td
                    style={{
                      padding: '12px 12px 12px 0',
                      fontSize: 13,
                      fontFamily:
                        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                      color: 'rgb(41, 42, 46)',
                      borderBottom: '1px solid rgba(11, 18, 14, 0.08)',
                    }}
                  >
                    {v.rule_name}
                  </td>
                  <td
                    style={{
                      padding: '12px 12px 12px 0',
                      borderBottom: '1px solid rgba(11, 18, 14, 0.08)',
                    }}
                  >
                    <span style={getSeverityBadgeStyle(v.severity)}>
                      {v.severity}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '12px 12px 12px 0',
                      fontSize: 14,
                      color: 'rgb(41, 42, 46)',
                      borderBottom: '1px solid rgba(11, 18, 14, 0.08)',
                    }}
                  >
                    {v.description}
                  </td>
                  <td
                    style={{
                      padding: '12px 12px 12px 0',
                      fontSize: 14,
                      color: 'rgb(80, 82, 88)',
                      borderBottom: '1px solid rgba(11, 18, 14, 0.08)',
                    }}
                  >
                    {v.surface_id}
                  </td>
                  <td
                    style={{
                      padding: '12px 12px 12px 0',
                      fontSize: 13,
                      color: 'rgb(80, 82, 88)',
                      borderBottom: '1px solid rgba(11, 18, 14, 0.08)',
                    }}
                  >
                    {new Date(v.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : selectedModule ? (
        <div
          style={{
            padding: '24px 0',
            fontSize: 14,
            color: 'rgb(80, 82, 88)',
          }}
        >
          No violations found. Design system is compliant for this module.
        </div>
      ) : (
        <div
          style={{
            padding: '24px 0',
            fontSize: 14,
            color: 'rgb(80, 82, 88)',
          }}
        >
          Select a module above to load its design system violations.
        </div>
      )}

      {/* ─── Recent audit changes ─── compact list, Jira-style */}
      {auditTrail.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 653,
              color: 'rgb(41, 42, 46)',
              margin: '0 0 12px 0',
              lineHeight: '20px',
            }}
          >
            Recent audit changes
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {auditTrail.map(entry => (
              <div
                key={entry.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 180px',
                  gap: 12,
                  padding: '8px 0',
                  borderBottom: '1px solid rgba(11, 18, 14, 0.08)',
                  fontSize: 14,
                }}
              >
                <div style={{ color: 'rgb(41, 42, 46)' }}>{entry.action}</div>
                <div style={{ color: 'rgb(80, 82, 88)', fontSize: 13 }}>
                  {new Date(entry.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
