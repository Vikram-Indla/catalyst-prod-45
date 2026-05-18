import React, { useState, useEffect } from 'react';
import Heading from '@atlaskit/heading';
import { Box } from '@atlaskit/primitives';
import Select from '@atlaskit/select';
import Button from '@atlaskit/button';
import { useQueryClient } from '@tanstack/react-query';
import { runAudit, AUDIT_MODULES, type Module } from '@/lib/design-audit';

interface AuditMessage {
  type: 'success' | 'error';
  text: string;
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

  return (
    <Box padding="space.200">
      <Heading as="h1">Design System & Governance</Heading>

      {/* Audit Control Section */}
      <Box
        padding="space.200"
        marginBlockStart="space.200"
        style={{
          borderBottom: '1px solid var(--ds-border)',
          backgroundColor: 'var(--ds-background-neutral-subtle)',
        }}
      >
        <Heading as="h2" size="medium">
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

      {/* Dashboard Tabs - TODO: Wire up with real data */}
      <Box marginBlockStart="space.400">
        <Heading as="h2" size="medium">
          Compliance Dashboard
        </Heading>
        <Box paddingBlockStart="space.200">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {/* Compliance Score */}
            <div style={{ padding: '16px', border: '1px solid var(--ds-border)', borderRadius: '4px' }}>
              <div style={{ fontSize: 'var(--ds-font-size-050, 12px)', color: 'var(--ds-text-subtlest)' }}>Compliance Score</div>
              <div style={{ fontSize: 'var(--ds-font-size-display, 28px)', fontWeight: 'bold', marginTop: '8px' }}>0%</div>
            </div>

            {/* Total Violations */}
            <div style={{ padding: '16px', border: '1px solid var(--ds-border)', borderRadius: '4px' }}>
              <div style={{ fontSize: 'var(--ds-font-size-050, 12px)', color: 'var(--ds-text-subtlest)' }}>Total Violations</div>
              <div style={{ fontSize: 'var(--ds-font-size-display, 28px)', fontWeight: 'bold', marginTop: '8px' }}>0</div>
            </div>

            {/* P0 Blockers */}
            <div style={{ padding: '16px', border: '1px solid var(--ds-border)', borderRadius: '4px' }}>
              <div style={{ fontSize: 'var(--ds-font-size-050, 12px)', color: 'var(--ds-text-danger)' }}>P0 Blockers</div>
              <div style={{ fontSize: 'var(--ds-font-size-display, 28px)', fontWeight: 'bold', marginTop: '8px', color: 'var(--ds-text-danger)' }}>0</div>
            </div>

            {/* Design Tokens */}
            <div style={{ padding: '16px', border: '1px solid var(--ds-border)', borderRadius: '4px' }}>
              <div style={{ fontSize: 'var(--ds-font-size-050, 12px)', color: 'var(--ds-text-subtlest)' }}>Design Tokens Used</div>
              <div style={{ fontSize: 'var(--ds-font-size-display, 28px)', fontWeight: 'bold', marginTop: '8px' }}>0</div>
            </div>
          </div>
        </Box>
      </Box>

      {/* Recent Audits Section - TODO: Display audit trail */}
      <Box marginBlockStart="space.400">
        <Heading as="h2" size="medium">
          Recent Audit Changes
        </Heading>
        <Box paddingBlockStart="space.200">
          <p style={{ color: 'var(--ds-text-subtlest)' }}>No audits run yet</p>
        </Box>
      </Box>
    </Box>
  );
}
