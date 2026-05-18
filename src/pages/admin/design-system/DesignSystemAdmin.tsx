import React, { useState, useEffect } from 'react';
import Select from '@atlaskit/select';
import Button from '@atlaskit/button';
import { getModuleViolations, getAuditHistory, runAudit } from '@/lib/design-audit';

export type Module = 'project-hub' | 'product-hub' | 'incidents' | 'releases' | 'reports' | 'admin' | 'resources';

interface Violation {
  id: string;
  rule: string;
  severity: 'P0' | 'P1' | 'P2';
  description: string;
  surface_id: string;
  created_at: string;
}

interface AuditTrail {
  id: string;
  action: string;
  module_id: string;
  created_at: string;
  details?: Record<string, any>;
}

interface AuditMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

const MODULE_OPTIONS = [
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
    { label: 'All Surfaces', value: 'all' },
    { label: 'Backlog', value: 'backlog' },
    { label: 'Board', value: 'board' },
    { label: 'List View', value: 'list' },
  ],
  'product-hub': [
    { label: 'All Surfaces', value: 'all' },
    { label: 'Product List', value: 'list' },
  ],
  incidents: [
    { label: 'All Surfaces', value: 'all' },
    { label: 'Incidents List', value: 'list' },
  ],
  releases: [
    { label: 'All Surfaces', value: 'all' },
    { label: 'Release Calendar', value: 'calendar' },
  ],
  reports: [
    { label: 'All Surfaces', value: 'all' },
    { label: 'Dashboard', value: 'dashboard' },
  ],
  admin: [
    { label: 'All Surfaces', value: 'all' },
    { label: 'Users & Access', value: 'users' },
  ],
  resources: [
    { label: 'All Surfaces', value: 'all' },
    { label: 'Capacity', value: 'capacity' },
  ],
};

export default function DesignSystemAdmin() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditTrail[]>([]);
  const [isLoadingViolations, setIsLoadingViolations] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedSurface, setSelectedSurface] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditMessage, setAuditMessage] = useState<AuditMessage | null>(null);

  // Fetch violations and audit history when module changes
  useEffect(() => {
    if (!selectedModule) {
      setViolations([]);
      setAuditTrail([]);
      return;
    }

    const fetchData = async () => {
      setIsLoadingViolations(true);
      try {
        const [violationData, trailData] = await Promise.all([
          getModuleViolations(selectedModule),
          getAuditHistory(selectedModule, 10),
        ]);
        setViolations(violationData || []);
        setAuditTrail(trailData || []);
      } catch (error) {
        console.error('Error fetching audit data:', error);
        setViolations([]);
        setAuditTrail([]);
      } finally {
        setIsLoadingViolations(false);
      }
    };

    fetchData();
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

      // Refresh violations
      const violationData = await getModuleViolations(selectedModule);
      setViolations(violationData || []);

      // Refresh audit trail
      const trailData = await getAuditHistory(selectedModule, 10);
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

  // Calculate metrics
  const totalViolations = violations.length;
  const p0Violations = violations.filter((v) => v.severity === 'P0').length;
  const p1Violations = violations.filter((v) => v.severity === 'P1').length;
  const complianceScore =
    totalViolations === 0
      ? 100
      : Math.max(0, 100 - totalViolations * 10);

  const getSeverityBadgeStyle = (severity: string) => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '3px',
    backgroundColor:
      severity === 'P0'
        ? 'var(--ds-background-danger-subtlest)'
        : severity === 'P1'
          ? 'var(--ds-background-warning-subtlest)'
          : 'var(--ds-background-neutral-subtlest)',
    color:
      severity === 'P0'
        ? 'var(--ds-text-danger)'
        : severity === 'P1'
          ? 'var(--ds-text-warning)'
          : 'var(--ds-text-subtlest)',
    fontSize: '12px',
    fontWeight: 500,
  });

  return (
    <div style={{ padding: '32px' }}>
      <h1
        style={{
          fontSize: '28px',
          fontWeight: 700,
          marginBottom: '24px',
          color: 'var(--ds-text)',
        }}
      >
        Design System & Governance
      </h1>

      {/* Control Panel */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-end',
          marginBottom: '32px',
          padding: '16px',
          backgroundColor: 'var(--ds-background-neutral-subtle)',
          borderRadius: '4px',
        }}
      >
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '8px',
              color: 'var(--ds-text-subtlest)',
            }}
          >
            Module
          </label>
          <Select
            options={MODULE_OPTIONS}
            value={
              selectedModule
                ? MODULE_OPTIONS.find((o) => o.value === selectedModule)
                : null
            }
            onChange={(option) =>
              setSelectedModule((option?.value as Module) || null)
            }
            placeholder="Select a module..."
            isClearable
          />
        </div>

        {selectedModule && (
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '8px',
                color: 'var(--ds-text-subtlest)',
              }}
            >
              Surface
            </label>
            <Select
              options={SURFACE_OPTIONS[selectedModule] || []}
              value={
                selectedSurface
                  ? SURFACE_OPTIONS[selectedModule]?.find(
                      (o) => o.value === selectedSurface
                    )
                  : null
              }
              onChange={(option) => setSelectedSurface(option?.value || null)}
              placeholder="Select a surface..."
              isClearable
            />
          </div>
        )}

        <Button
          appearance="primary"
          onClick={handleRunAudit}
          isDisabled={!selectedModule || isAuditing}
        >
          {isAuditing ? 'Running Audit...' : 'Run Audit'}
        </Button>
      </div>

      {/* Audit Message */}
      {auditMessage && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '24px',
            borderRadius: '4px',
            backgroundColor:
              auditMessage.type === 'success'
                ? 'var(--ds-background-success-subtlest)'
                : auditMessage.type === 'error'
                  ? 'var(--ds-background-danger-subtlest)'
                  : 'var(--ds-background-information-subtlest)',
            color:
              auditMessage.type === 'success'
                ? 'var(--ds-text-success)'
                : auditMessage.type === 'error'
                  ? 'var(--ds-text-danger)'
                  : 'var(--ds-text-information)',
            fontSize: '13px',
          }}
        >
          {auditMessage.text}
        </div>
      )}

      {/* Compliance Dashboard */}
      {selectedModule && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--ds-background-neutral-subtle)',
              borderRadius: '4px',
              border: '1px solid var(--ds-border)',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--ds-text-subtlest)',
                marginBottom: '8px',
              }}
            >
              Compliance Score
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: 'var(--ds-text)',
              }}
            >
              {complianceScore}%
            </div>
          </div>

          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--ds-background-neutral-subtle)',
              borderRadius: '4px',
              border: '1px solid var(--ds-border)',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--ds-text-subtlest)',
                marginBottom: '8px',
              }}
            >
              Total Violations
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: 'var(--ds-text)',
              }}
            >
              {totalViolations}
            </div>
          </div>

          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--ds-background-neutral-subtle)',
              borderRadius: '4px',
              border: '1px solid var(--ds-border)',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--ds-text-danger)',
                marginBottom: '8px',
              }}
            >
              P0 Blockers
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: 'var(--ds-text-danger)',
              }}
            >
              {p0Violations}
            </div>
          </div>

          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--ds-background-neutral-subtle)',
              borderRadius: '4px',
              border: '1px solid var(--ds-border)',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--ds-text-warning)',
                marginBottom: '8px',
              }}
            >
              P1 Issues
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: 'var(--ds-text-warning)',
              }}
            >
              {p1Violations}
            </div>
          </div>
        </div>
      )}

      {/* Design Violations Table */}
      {isLoadingViolations ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--ds-text-subtlest)' }}>
          Loading violations...
        </div>
      ) : violations.length > 0 ? (
        <div style={{ marginBottom: '32px' }}>
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 600,
              marginBottom: '16px',
              color: 'var(--ds-text)',
            }}
          >
            Design Violations ({violations.length})
          </h2>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1px solid var(--ds-border)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: 'var(--ds-background-neutral-subtle)' }}>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--ds-text-subtlest)',
                    borderBottom: '1px solid var(--ds-border)',
                  }}
                >
                  Rule
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--ds-text-subtlest)',
                    borderBottom: '1px solid var(--ds-border)',
                    width: '80px',
                  }}
                >
                  Severity
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--ds-text-subtlest)',
                    borderBottom: '1px solid var(--ds-border)',
                  }}
                >
                  Description
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--ds-text-subtlest)',
                    borderBottom: '1px solid var(--ds-border)',
                    width: '120px',
                  }}
                >
                  Surface
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--ds-text-subtlest)',
                    borderBottom: '1px solid var(--ds-border)',
                    width: '140px',
                  }}
                >
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {violations.map((violation, idx) => (
                <tr
                  key={violation.id}
                  style={{
                    borderBottom:
                      idx < violations.length - 1
                        ? '1px solid var(--ds-border)'
                        : 'none',
                  }}
                >
                  <td
                    style={{
                      padding: '12px 16px',
                      fontSize: '13px',
                      color: 'var(--ds-text)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {violation.rule}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={getSeverityBadgeStyle(violation.severity)}>
                      {violation.severity}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontSize: '13px',
                      color: 'var(--ds-text)',
                    }}
                  >
                    {violation.description}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontSize: '13px',
                      color: 'var(--ds-text-subtlest)',
                    }}
                  >
                    {violation.surface_id}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontSize: '12px',
                      color: 'var(--ds-text-subtlest)',
                    }}
                  >
                    {new Date(violation.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : selectedModule ? (
        <div
          style={{
            padding: '32px',
            textAlign: 'center',
            color: 'var(--ds-text-subtlest)',
            backgroundColor: 'var(--ds-background-neutral-subtle)',
            borderRadius: '4px',
            marginBottom: '32px',
          }}
        >
          No violations found. Design system is compliant!
        </div>
      ) : null}

      {/* Recent Audit Changes */}
      {auditTrail.length > 0 && (
        <div>
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 600,
              marginBottom: '16px',
              color: 'var(--ds-text)',
            }}
          >
            Recent Audit Changes
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {auditTrail.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--ds-background-neutral-subtle)',
                  borderLeft: '4px solid var(--ds-border-information)',
                  borderRadius: '0 4px 4px 0',
                  fontSize: '13px',
                  color: 'var(--ds-text)',
                }}
              >
                <div style={{ fontWeight: 600 }}>{entry.action}</div>
                <div style={{ fontSize: '12px', color: 'var(--ds-text-subtlest)' }}>
                  {new Date(entry.created_at).toLocaleString()}
                </div>
                {entry.details && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--ds-text-subtlest)',
                      marginTop: '4px',
                    }}
                  >
                    {JSON.stringify(entry.details).substring(0, 100)}...
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
