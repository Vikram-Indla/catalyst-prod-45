import React, { useState, useEffect } from 'react';
import Heading from '@atlaskit/heading';
import { Box } from '@atlaskit/primitives';
import Select from '@atlaskit/select';
import Button from '@atlaskit/button';
import { useQueryClient } from '@tanstack/react-query';
import { runAudit, AUDIT_MODULES, type Module, getModuleViolations, getAuditHistory } from '@/lib/design-audit';

interface AuditMessage {
  type: 'success' | 'error';
  text: string;
}

interface Violation {
  id?: string;
  surface_id: string;
  rule_name: string;
  severity: 'P0' | 'P1' | 'P2';
  description: string;
  created_at: string;
}

interface AuditTrail {
  id: string;
  action: string;
  surface_id: string;
  change_summary: string;
  created_at: string;
}

/**
 * Design System & Governance admin surface
 * — centralized control for ADS compliance, component audits, and governance rules
 */
export default function DesignSystemAdmin() {
  const queryClient = useQueryClient();
  const [isAuditing, setIsAuditing] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedSurface, setSelectedSurface] = useState<string | null>(null);
  const [auditMessage, setAuditMessage] = useState<AuditMessage | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditTrail[]>([]);
  const [isLoadingViolations, setIsLoadingViolations] = useState(false);

  // Get module options for dropdown
  const moduleOptions = Object.entries(AUDIT_MODULES).map(([key, config]) => ({
    label: config.label,
    value: key as Module,
  }));

  // Get surface options based on selected module
  const surfaceOptions = selectedModule && AUDIT_MODULES[selectedModule].surfaces
    ? AUDIT_MODULES[selectedModule].surfaces.map(surface => ({
        label: surface.label,
        value: surface.id,
      }))
    : [];

  // Fetch violations and audit trail when module changes
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

  // Handle audit execution
  const handleRunAudit = async () => {
    if (!selectedModule) {
      setAuditMessage({
        type: 'error',
        text: '❌ Please select a module to audit',
      });
      return;
    }

    setIsAuditing(true);
    setAuditMessage(null);

    try {
      const result = await runAudit({
        module: selectedModule,
        surface: selectedSurface || undefined,
      });

      // Invalidate queries to refresh dashboard data
      queryClient.invalidateQueries();

      const violationCount = result.violationCount;
      const tokenCount = result.tokenCount;

      // Refresh violations and audit trail
      const [violationData, trailData] = await Promise.all([
        getModuleViolations(selectedModule),
        getAuditHistory(selectedModule, 10),
      ]);
      setViolations(violationData || []);
      setAuditTrail(trailData || []);

      setAuditMessage({
        type: 'success',
        text: `✅ Audit complete: ${violationCount} violations found, ${tokenCount} tokens detected`,
      });
    } catch (error) {
      console.error('Audit error:', error);
      setAuditMessage({
        type: 'error',
        text: `❌ Audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsAuditing(false);
    }
  };

  // Calculate compliance metrics
  const totalViolations = violations.length;
  const p0Violations = violations.filter(v => v.severity === 'P0').length;
  const complianceScore = totalViolations === 0 ? 100 : Math.max(0, 100 - (totalViolations * 10));

  return (
    <Box padding="space.300" style={{ maxWidth: '100%' }}>
      <Heading as="h1" style={{ fontSize: '28px', fontWeight: 700, marginBottom: '24px', color: 'var(--ds-text, #292A2E)' }}>
        Design System & Governance
      </Heading>

      {/* Audit Control Section */}
      <Box
        padding="space.300"
        marginBlockStart="space.300"
        style={{
          borderBottom: '1px solid var(--ds-border)',
          backgroundColor: 'var(--ds-background-neutral-subtle)',
        }}
      >
        <Heading as="h2" size="medium" style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--ds-text, #292A2E)' }}>
          Run Design Audit
        </Heading>

        <Box marginBlockStart="space.200" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {/* Module Selector */}
          <Box style={{ flex: '0 1 300px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--ds-font-size-050, 12px)', fontWeight: 500 }}>
              Module
            </label>
            <Select
              options={moduleOptions}
              value={selectedModule ? { label: AUDIT_MODULES[selectedModule].label, value: selectedModule } : null}
              onChange={(option) => {
                setSelectedModule(option?.value ?? null);
                setSelectedSurface(null); // Reset surface when module changes
              }}
              isDisabled={isAuditing}
              placeholder="Select a module..."
            />
          </Box>

          {/* Surface Selector (conditional) */}
          {selectedModule && surfaceOptions.length > 0 && (
            <Box style={{ flex: '0 1 300px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--ds-font-size-050, 12px)', fontWeight: 500 }}>
                Surface (optional)
              </label>
              <Select
                options={surfaceOptions}
                value={selectedSurface ? { label: surfaceOptions.find(s => s.value === selectedSurface)?.label, value: selectedSurface } : null}
                onChange={(option) => setSelectedSurface(option?.value ?? null)}
                isDisabled={isAuditing}
                isClearable
                placeholder="All surfaces in module"
              />
            </Box>
          )}

          {/* Run Audit Button */}
          <Button
            appearance="primary"
            onClick={handleRunAudit}
            isDisabled={!selectedModule || isAuditing}
            isLoading={isAuditing}
          >
            {isAuditing ? 'Running Audit...' : 'Run Audit'}
          </Button>
        </Box>

        {/* Status Message */}
        {auditMessage && (
          <Box
            marginBlockStart="space.200"
            padding="space.150"
            style={{
              borderRadius: '4px',
              backgroundColor: auditMessage.type === 'success'
                ? 'var(--ds-background-success-subtlest)'
                : 'var(--ds-background-danger-subtlest)',
              color: auditMessage.type === 'success'
                ? 'var(--ds-text-success)'
                : 'var(--ds-text-danger)',
            }}
          >
            {auditMessage.text}
          </Box>
        )}
      </Box>

      {/* Compliance Dashboard */}
      <Box marginBlockStart="space.400">
        <Heading as="h2" size="medium" style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--ds-text, #292A2E)' }}>
          Compliance Dashboard
        </Heading>
        <Box paddingBlockStart="space.200">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {/* Compliance Score */}
            <div style={{ padding: '16px', border: '1px solid var(--ds-border)', borderRadius: '4px' }}>
              <div style={{ fontSize: '12px', color: 'var(--ds-text-subtlest)', fontWeight: 500 }}>Compliance Score</div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: 'var(--ds-text, #292A2E)' }}>{Math.round(complianceScore)}%</div>
            </div>

            {/* Total Violations */}
            <div style={{ padding: '16px', border: '1px solid var(--ds-border)', borderRadius: '4px' }}>
              <div style={{ fontSize: '12px', color: 'var(--ds-text-subtlest)', fontWeight: 500 }}>Total Violations</div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: 'var(--ds-text, #292A2E)' }}>{totalViolations}</div>
            </div>

            {/* P0 Blockers */}
            <div style={{ padding: '16px', border: '1px solid var(--ds-border)', borderRadius: '4px' }}>
              <div style={{ fontSize: '12px', color: 'var(--ds-text-danger)', fontWeight: 500 }}>P0 Blockers</div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: 'var(--ds-text-danger)' }}>{p0Violations}</div>
            </div>

            {/* P1 Issues */}
            <div style={{ padding: '16px', border: '1px solid var(--ds-border)', borderRadius: '4px' }}>
              <div style={{ fontSize: '12px', color: 'var(--ds-text-subtlest)', fontWeight: 500 }}>P1 Issues</div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: 'var(--ds-text, #292A2E)' }}>{violations.filter(v => v.severity === 'P1').length}</div>
            </div>
          </div>
        </Box>
      </Box>

      {/* Violations Section */}
      {violations.length > 0 && (
        <Box marginBlockStart="space.400">
          <Heading as="h2" size="medium" style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--ds-text, #292A2E)' }}>
            Design Violations
          </Heading>
          <Box style={{
            border: '1px solid var(--ds-border)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--ds-background-neutral-subtle)', borderBottom: '1px solid var(--ds-border)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--ds-text, #292A2E)' }}>Rule</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--ds-text, #292A2E)' }}>Severity</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--ds-text, #292A2E)' }}>Description</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--ds-text, #292A2E)' }}>Surface</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--ds-text, #292A2E)' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {violations.map((violation, idx) => (
                  <tr key={idx} style={{ borderBottom: idx < violations.length - 1 ? '1px solid var(--ds-border)' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--ds-text, #292A2E)', fontFamily: 'monospace' }}>
                      {violation.rule_name}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600 }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '3px',
                        backgroundColor: violation.severity === 'P0'
                          ? 'var(--ds-background-danger-subtlest)'
                          : violation.severity === 'P1'
                          ? 'var(--ds-background-warning-subtlest)'
                          : 'var(--ds-background-neutral-subtlest)',
                        color: violation.severity === 'P0'
                          ? 'var(--ds-text-danger)'
                          : violation.severity === 'P1'
                          ? 'var(--ds-text-warning)'
                          : 'var(--ds-text-subtlest)',
                      }}>
                        {violation.severity}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--ds-text, #292A2E)' }}>
                      {violation.description}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--ds-text-subtlest)' }}>
                      {violation.surface_id}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--ds-text-subtlest)' }}>
                      {new Date(violation.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Box>
      )}

      {/* Recent Audit Changes Section */}
      <Box marginBlockStart="space.400">
        <Heading as="h2" size="medium" style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--ds-text, #292A2E)' }}>
          Recent Audit Changes
        </Heading>
        <Box paddingBlockStart="space.200">
          {isLoadingViolations ? (
            <p style={{ color: 'var(--ds-text-subtlest)' }}>Loading audit trail...</p>
          ) : auditTrail.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {auditTrail.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: 'var(--ds-background-neutral-subtle)',
                    borderRadius: '4px',
                    borderLeft: '4px solid var(--ds-border-information)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, #292A2E)' }}>
                        {entry.change_summary}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ds-text-subtlest)', marginTop: '4px' }}>
                        {entry.action.replace(/_/g, ' ')} • {entry.surface_id}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--ds-text-subtlest)', whiteSpace: 'nowrap' }}>
                      {new Date(entry.created_at).toLocaleDateString()} {new Date(entry.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--ds-text-subtlest)' }}>No audits run yet</p>
          )}
        </Box>
      </Box>
    </Box>
  );
}
