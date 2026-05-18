import React, { useState, useEffect } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import Toggle from '@atlaskit/toggle';
import AtlasButton from '@atlaskit/button/new';
import Spinner from '@atlaskit/spinner';
import ShieldIcon from '@atlaskit/icon/core/shield';
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import WarningIcon from '@atlaskit/icon/core/warning';
import { toast } from 'sonner';

interface EnforcementConfig {
  enforceStrictly: boolean;
  description: string;
  lastUpdated: string;
  updatedBy: string;
  mode: string;
  notes: string;
}

export default function GovernanceSettings() {
  // State management
  const [config, setConfig] = useState<EnforcementConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [localEnforceStrictly, setLocalEnforceStrictly] = useState(true);

  // Load current config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // In development, use a default config. In production, this would fetch from Supabase.
        const defaultConfig: EnforcementConfig = {
          enforceStrictly: true,
          description:
            'Design System Enforcement Toggle. When true: violations BLOCK PR merge (exit code 1). When false: violations logged but don\'t block (exit code 0).',
          lastUpdated: new Date().toISOString(),
          updatedBy: 'System Default',
          mode: 'STRICT',
          notes: 'Set to false only during migration phases or testing. Production should always be true.',
        };

        try {
          const response = await fetch('/api/admin/governance/config');
          if (response.ok) {
            const data = await response.json();
            setConfig(data);
            setLocalEnforceStrictly(data.enforceStrictly);
          } else {
            // API not available, use default
            setConfig(defaultConfig);
            setLocalEnforceStrictly(defaultConfig.enforceStrictly);
          }
        } catch (fetchErr) {
          // API endpoint doesn't exist yet, use default config
          console.info('Governance API not available, using default config');
          setConfig(defaultConfig);
          setLocalEnforceStrictly(defaultConfig.enforceStrictly);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  // Handle toggle change
  const handleToggle = (newValue: boolean) => {
    setLocalEnforceStrictly(newValue);
    setHasChanges(newValue !== config?.enforceStrictly);
  };

  // Save changes
  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/governance/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enforceStrictly: localEnforceStrictly,
        }),
      });

      if (!response.ok) throw new Error('Failed to save governance config');

      const updatedConfig = await response.json();
      setConfig(updatedConfig);
      setHasChanges(false);
      toast.success(`Design System Enforcement mode: ${localEnforceStrictly ? 'STRICT 🔒' : 'LENIENT 📋'}`);
    } catch (error) {
      console.error('Error saving governance config:', error);
      toast.error('Failed to save governance settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset changes
  const handleReset = () => {
    if (config) {
      setLocalEnforceStrictly(config.enforceStrictly);
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return (
      <AdminGuard>
        <div className="flex-1 flex items-center justify-center">
          <Spinner appearance="inherit" />
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
    <div className="flex-1 overflow-y-auto">
      {/* Page Header */}
      <div
        className="border-b px-6 py-5"
        style={{ borderColor: 'var(--cp-border-default)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--ds-background-selected, #EFF6FF)' }}
          >
            <ShieldIcon label="" size="small" />
          </div>
          <div>
            <h1
              className="text-base font-semibold leading-tight"
              style={{ color: 'var(--cp-text-primary)', fontFamily: 'var(--cp-font-heading)' }}
            >
              Design System Governance
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--cp-text-muted)' }}>
              Control enforcement mode for Atlassian Design System (ADS v4) compliance
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 max-w-3xl">

        {/* Enforcement Mode Card */}
        <div
          className="border rounded-lg p-6 mb-6"
          style={{
            borderColor: 'var(--cp-border-default)',
            backgroundColor: localEnforceStrictly
              ? 'rgba(31, 132, 90, 0.04)'
              : 'rgba(212, 53, 28, 0.04)',
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text-primary)' }}>
                {localEnforceStrictly ? '🔒 STRICT MODE' : '📋 LENIENT MODE'}
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--cp-text-muted)' }}>
                {localEnforceStrictly
                  ? 'Design system violations will BLOCK PR merges. CI will fail on violations.'
                  : 'Design system violations will be logged but will NOT block PR merges.'}
              </p>
            </div>
            <div className="flex-shrink-0">
              {localEnforceStrictly ? (
                <div
                  className="w-8 h-8 rounded flex items-center justify-center"
                  style={{ background: 'var(--ds-background-success-bold, #1F845A)' }}
                >
                  <CheckMarkIcon label="" size="small" style={{ color: 'white' }} />
                </div>
              ) : (
                <div
                  className="w-8 h-8 rounded flex items-center justify-center"
                  style={{ background: 'var(--ds-background-warning-bold, #974F0C)' }}
                >
                  <WarningIcon label="" size="small" style={{ color: 'white' }} />
                </div>
              )}
            </div>
          </div>

          {/* Toggle Control */}
          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--cp-border-default)' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--cp-text-primary)' }}>
                Enable Strict Enforcement
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--cp-text-muted)' }}>
                When enabled, violations will block merges. When disabled, violations are logged only.
              </p>
            </div>
            <Toggle
              isChecked={localEnforceStrictly}
              onChange={(evt) => handleToggle(evt.target.checked)}
              aria-label="Toggle strict enforcement mode"
            />
          </div>
        </div>

        {/* Governance Rules Card */}
        <div
          className="border rounded-lg p-6 mb-6"
          style={{ borderColor: 'var(--cp-border-default)' }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--cp-text-primary)' }}>
            Design System Rules (ADS v4)
          </h3>
          <div className="space-y-2 text-xs" style={{ color: 'var(--cp-text-muted)' }}>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-1 h-1 rounded-full mt-1.5" style={{ background: 'var(--cp-text-muted)' }} />
              <span>✅ <strong>Use @atlaskit/* components only</strong> — no react-select, react-modal, hand-rolled menus</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-1 h-1 rounded-full mt-1.5" style={{ background: 'var(--cp-text-muted)' }} />
              <span>✅ <strong>Use var(--ds-*) ADS tokens only</strong> — no hardcoded hex colors, no Tailwind classes</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-1 h-1 rounded-full mt-1.5" style={{ background: 'var(--cp-text-muted)' }} />
              <span>✅ <strong>Spacing grid: 4px/8px/16px/24px/32px only</strong> — no arbitrary px values</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-1 h-1 rounded-full mt-1.5" style={{ background: 'var(--cp-text-muted)' }} />
              <span>✅ <strong>Sentence-case labels only</strong> — no text-transform: uppercase</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-1 h-1 rounded-full mt-1.5" style={{ background: 'var(--cp-text-muted)' }} />
              <span>✅ <strong>Never render banned fields</strong> — Story Points, MDT Ref, Assessment Feature, Service Now#</span>
            </div>
          </div>
        </div>

        {/* Current Config Info */}
        {config && (
          <div
            className="border rounded-lg p-4 text-xs"
            style={{
              borderColor: 'var(--cp-border-default)',
              backgroundColor: 'var(--ds-background-neutral, #F1F2F4)',
              color: 'var(--cp-text-muted)',
            }}
          >
            <p className="mb-1">
              <strong>Last Updated:</strong> {new Date(config.lastUpdated).toLocaleString()}
            </p>
            <p className="mb-1">
              <strong>Updated By:</strong> {config.updatedBy}
            </p>
            <p>
              <strong>Notes:</strong> {config.notes}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-6">
          <AtlasButton
            appearance="primary"
            onClick={handleSave}
            isDisabled={!hasChanges || isSaving}
            isLoading={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </AtlasButton>
          <AtlasButton
            appearance="subtle"
            onClick={handleReset}
            isDisabled={!hasChanges}
          >
            Cancel
          </AtlasButton>
        </div>

        {/* Help Text */}
        <div className="mt-8 p-4 rounded-lg" style={{ backgroundColor: 'var(--ds-background-information, #DFFCF0)' }}>
          <p className="text-xs" style={{ color: 'var(--cp-text-primary)' }}>
            <strong>💡 Use Cases:</strong>
          </p>
          <ul className="text-xs mt-2 space-y-1" style={{ color: 'var(--cp-text-muted)' }}>
            <li>• <strong>Production (STRICT):</strong> Violations block merges. Design system compliance is enforced.</li>
            <li>• <strong>Migration Phase (LENIENT):</strong> Violations are logged but don't block. Allows gradual adoption.</li>
            <li>• <strong>Testing (LENIENT):</strong> Temporarily disable enforcement while testing design system changes.</li>
          </ul>
        </div>
      </div>
    </div>
    </AdminGuard>
  );
}
