import React, { useState, useEffect, useMemo } from 'react';
import Select from '@atlaskit/select';
import Button, { IconButton } from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import SearchIcon from '@atlaskit/icon/core/search';
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import CrossIcon from '@atlaskit/icon/core/cross';
import CopyIcon from '@atlaskit/icon/core/copy';
import LinkExternalIcon from '@atlaskit/icon/core/link-external';
import {
  getModuleViolations,
  getAuditHistory,
  runAudit,
  markViolationResolved,
  reopenViolation,
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
    padding: '4px 8px',
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
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [showResolved, setShowResolved] = useState(false);

  const toggleExpanded = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setAuditMessage({ type: 'info', text: 'Copied to clipboard.' });
      setTimeout(() => setAuditMessage(null), 1500);
    } catch {
      setAuditMessage({
        type: 'error',
        text: 'Could not access clipboard. Please copy manually.',
      });
    }
  };

  const copyLocation = (v: Violation) => {
    const loc = v.file_path
      ? `${v.file_path}${v.line_number ? ':' + v.line_number : ''}`
      : v.surface_id;
    copyToClipboard(loc);
  };

  const handleResolve = async (id: number) => {
    try {
      await markViolationResolved(id, 'resolved');
      // Optimistically remove from the open list.
      setViolations(prev => prev.filter(v => v.id !== id));
      setAuditMessage({
        type: 'success',
        text: 'Violation marked fixed. Re-run the audit to verify.',
      });
    } catch (err) {
      setAuditMessage({
        type: 'error',
        text: `Could not mark resolved: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`,
      });
    }
  };

  const handleReopen = async (id: number) => {
    try {
      await reopenViolation(id);
      // Refetch so the row reappears in the open list.
      if (selectedModule) {
        const data = await getModuleViolations(selectedModule);
        setViolations(data || []);
      }
    } catch (err) {
      setAuditMessage({
        type: 'error',
        text: `Could not reopen: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`,
      });
    }
  };

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
        color: 'var(--ds-text, rgb(41, 42, 46))',
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
              color: 'var(--ds-text, rgb(41, 42, 46))',
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
          color: 'var(--ds-text-subtle, rgb(80, 82, 88))',
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
              color: 'var(--ds-text-subtle, rgb(80, 82, 88))',
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
                color: 'var(--ds-text-subtle, rgb(80, 82, 88))',
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
                  ? 'var(--ds-text-success, rgb(33, 110, 78))'
                  : complianceScore >= 50
                    ? 'var(--ds-text-warning, rgb(133, 79, 4))'
                    : 'var(--ds-text-danger, rgb(174, 42, 25))',
            },
            { label: 'Total violations', value: totalViolations },
            {
              label: 'P0 blockers',
              value: p0Violations,
              valueColor: p0Violations > 0 ? 'var(--ds-text-danger, rgb(174, 42, 25))' : 'var(--ds-text, rgb(41, 42, 46))',
            },
            {
              label: 'P1 issues',
              value: p1Violations,
              valueColor: p1Violations > 0 ? 'var(--ds-text-warning, rgb(133, 79, 4))' : 'var(--ds-text, rgb(41, 42, 46))',
            },
          ].map(card => (
            <div
              key={card.label}
              style={{
                flex: '1 1 180px',
                minWidth: 160,
                padding: '12px 16px',
                background: 'var(--ds-surface, #FFFFFF)',
                border: '1px solid var(--ds-border, rgba(11, 18, 14, 0.14))',
                borderRadius: 3,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--ds-text-subtle, rgb(80, 82, 88))',
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
                  color: card.valueColor || 'var(--ds-text, rgb(41, 42, 46))',
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
            color: 'var(--ds-text-subtle, rgb(80, 82, 88))',
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
                  { key: 'rule', label: 'Rule', width: '24%' },
                  { key: 'sev', label: 'Severity', width: '90px' },
                  { key: 'desc', label: 'Description', width: 'auto' },
                  { key: 'location', label: 'Location', width: '220px' },
                  { key: 'actions', label: 'Actions', width: '140px' },
                ].map(col => (
                  <th
                    key={col.key}
                    scope="col"
                    style={{
                      textAlign: col.key === 'actions' ? 'right' : 'left',
                      fontSize: 12,
                      fontWeight: 653,
                      color: 'var(--ds-text-subtle, rgb(80, 82, 88))',
                      padding: '8px 12px 8px 0',
                      borderBottom: '1.67px solid var(--ds-border, rgba(11, 18, 14, 0.14))',
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
              {visibleViolations.map(v => {
                const isExpanded = expandedIds.has(v.id);
                const hasDetails = Boolean(
                  v.file_path || v.code_snippet || v.suggested_fix,
                );
                return (
                  <React.Fragment key={v.id}>
                    <tr
                      style={{ cursor: hasDetails ? 'pointer' : 'default' }}
                      onClick={() => hasDetails && toggleExpanded(v.id)}
                    >
                      <td
                        style={{
                          padding: '12px 12px 12px 0',
                          fontSize: 13,
                          fontFamily:
                            'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                          color: 'var(--ds-text, rgb(41, 42, 46))',
                          borderBottom: '1px solid var(--ds-border-subtle, rgba(11, 18, 14, 0.08))',
                        }}
                      >
                        {hasDetails && (
                          <span
                            aria-hidden
                            style={{
                              display: 'inline-block',
                              width: 12,
                              marginRight: 4,
                              color: 'var(--ds-text-subtlest, rgb(107,110,118))',
                              transform: isExpanded
                                ? 'rotate(90deg)'
                                : 'rotate(0deg)',
                              transition: 'transform 120ms ease',
                            }}
                          >
                            ▸
                          </span>
                        )}
                        {v.rule_name}
                      </td>
                      <td
                        style={{
                          padding: '12px 12px 12px 0',
                          borderBottom: '1px solid var(--ds-border-subtle, rgba(11, 18, 14, 0.08))',
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
                          color: 'var(--ds-text, rgb(41, 42, 46))',
                          borderBottom: '1px solid var(--ds-border-subtle, rgba(11, 18, 14, 0.08))',
                        }}
                      >
                        {v.description}
                      </td>
                      <td
                        style={{
                          padding: '12px 12px 12px 0',
                          fontSize: 13,
                          fontFamily:
                            'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                          color: 'var(--ds-text-subtle, rgb(80, 82, 88))',
                          borderBottom: '1px solid var(--ds-border-subtle, rgba(11, 18, 14, 0.08))',
                          maxWidth: 220,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={
                          v.file_path
                            ? `${v.file_path}${
                                v.line_number ? ':' + v.line_number : ''
                              }`
                            : v.surface_id
                        }
                      >
                        {v.file_path ? (
                          <>
                            {v.file_path.split('/').pop()}
                            {v.line_number ? `:${v.line_number}` : ''}
                          </>
                        ) : (
                          <span style={{ color: 'var(--ds-text-subtlest, rgb(107,110,118))' }}>
                            {v.surface_id}
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '8px 0 8px 0',
                          textAlign: 'right',
                          borderBottom: '1px solid var(--ds-border-subtle, rgba(11, 18, 14, 0.08))',
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <div
                          style={{
                            display: 'inline-flex',
                            gap: 4,
                            alignItems: 'center',
                          }}
                        >
                          {(v.file_path || v.code_snippet) && (
                            <IconButton
                              icon={CopyIcon}
                              label="Copy file:line"
                              appearance="subtle"
                              onClick={() => copyLocation(v)}
                              spacing="compact"
                            />
                          )}
                          {v.status === 'resolved' ||
                          v.status === 'wont_fix' ? (
                            <Button
                              appearance="subtle"
                              onClick={() => handleReopen(v.id)}
                              spacing="compact"
                            >
                              Reopen
                            </Button>
                          ) : (
                            <Button
                              appearance="default"
                              iconBefore={CheckMarkIcon}
                              onClick={() => handleResolve(v.id)}
                              spacing="compact"
                            >
                              Mark fixed
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && hasDetails && (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            padding: '0 12px 16px 16px',
                            background: 'var(--ds-background-neutral-subtle, rgba(9, 30, 66, 0.03))',
                            borderBottom: '1px solid var(--ds-border-subtle, rgba(11, 18, 14, 0.08))',
                          }}
                        >
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '120px 1fr',
                              gap: 8,
                              fontSize: 13,
                              paddingTop: 12,
                            }}
                          >
                            {v.file_path && (
                              <>
                                <div
                                  style={{
                                    color: 'var(--ds-text-subtle, rgb(80,82,88))',
                                    fontWeight: 500,
                                  }}
                                >
                                  Location
                                </div>
                                <div
                                  style={{
                                    fontFamily:
                                      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                                    color: 'var(--ds-text, rgb(41,42,46))',
                                  }}
                                >
                                  {v.file_path}
                                  {v.line_number ? `:${v.line_number}` : ''}
                                  <button
                                    onClick={() => copyLocation(v)}
                                    style={{
                                      marginLeft: 8,
                                      background: 'transparent',
                                      border: '1px solid var(--ds-border, rgba(11,18,14,0.14))',
                                      borderRadius: 3,
                                      padding: '0 8px',
                                      fontSize: 11,
                                      cursor: 'pointer',
                                      color: 'var(--ds-text-information, rgb(24,104,219))',
                                    }}
                                  >
                                    Copy
                                  </button>
                                </div>
                              </>
                            )}
                            {v.code_snippet && (
                              <>
                                <div
                                  style={{
                                    color: 'var(--ds-text-subtle, rgb(80,82,88))',
                                    fontWeight: 500,
                                  }}
                                >
                                  Offending code
                                </div>
                                <pre
                                  style={{
                                    margin: 0,
                                    padding: 8,
                                    background: 'var(--ds-surface, #FFFFFF)',
                                    border: '1px solid var(--ds-border, rgba(11,18,14,0.14))',
                                    borderRadius: 3,
                                    fontFamily:
                                      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                                    fontSize: 12,
                                    overflowX: 'auto',
                                    color: 'var(--ds-text, rgb(41,42,46))',
                                  }}
                                >
                                  {v.code_snippet}
                                </pre>
                              </>
                            )}
                            {v.suggested_fix && (
                              <>
                                <div
                                  style={{
                                    color: 'var(--ds-text-subtle, rgb(80,82,88))',
                                    fontWeight: 500,
                                  }}
                                >
                                  Suggested fix
                                </div>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 8,
                                  }}
                                >
                                  <div
                                    style={{
                                      flex: 1,
                                      color: 'var(--ds-text, rgb(41,42,46))',
                                    }}
                                  >
                                    {v.suggested_fix}
                                  </div>
                                  <button
                                    onClick={() =>
                                      copyToClipboard(v.suggested_fix!)
                                    }
                                    style={{
                                      background: 'transparent',
                                      border: '1px solid var(--ds-border, rgba(11,18,14,0.14))',
                                      borderRadius: 3,
                                      padding: '4px 8px',
                                      fontSize: 11,
                                      cursor: 'pointer',
                                      color: 'var(--ds-text-information, rgb(24,104,219))',
                                      flexShrink: 0,
                                    }}
                                  >
                                    Copy fix
                                  </button>
                                </div>
                              </>
                            )}
                            <div
                              style={{
                                color: 'var(--ds-text-subtle, rgb(80,82,88))',
                                fontWeight: 500,
                              }}
                            >
                              Created
                            </div>
                            <div style={{ color: 'var(--ds-text-subtle, rgb(80,82,88))' }}>
                              {new Date(v.created_at).toLocaleString()}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : selectedModule ? (
        <div
          style={{
            padding: '24px 0',
            fontSize: 14,
            color: 'var(--ds-text-subtle, rgb(80, 82, 88))',
          }}
        >
          No violations found. Design system is compliant for this module.
        </div>
      ) : (
        <div
          style={{
            padding: '24px 0',
            fontSize: 14,
            color: 'var(--ds-text-subtle, rgb(80, 82, 88))',
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
              color: 'var(--ds-text, rgb(41, 42, 46))',
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
                  borderBottom: '1px solid var(--ds-border-subtle, rgba(11, 18, 14, 0.08))',
                  fontSize: 14,
                }}
              >
                <div style={{ color: 'var(--ds-text, rgb(41, 42, 46))' }}>{entry.action}</div>
                <div style={{ color: 'var(--ds-text-subtle, rgb(80, 82, 88))', fontSize: 13 }}>
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
