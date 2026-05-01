/**
 * 🚨 CATALYST ZERO-MOCK GUARDRAIL
 * 
 * Drop this component into any page/panel where mock data was previously used.
 * It renders a prominent warning banner so developers and reviewers know
 * the data source has been cleaned and must stay clean.
 */

import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface MockDataWarningProps {
  /** Which module/hook was cleaned */
  module: string;
  /** What to do instead */
  guidance?: string;
}

export function MockDataWarning({ module, guidance }: MockDataWarningProps) {
  if (import.meta.env.PROD) return null; // Never show in production

  return (
    <div
      role="alert"
      className="border-2 border-destructive/40 bg-destructive/5 rounded-lg p-4 my-4 mx-auto max-w-2xl"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-destructive text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            CATALYST ZERO-MOCK POLICY VIOLATION
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>{module}</strong> previously contained hardcoded mock data which has been removed.
          </p>
          {guidance && (
            <p className="text-xs text-muted-foreground/80 mt-1">
              ℹ️ {guidance}
            </p>
          )}
          <p className="text-xs text-destructive/70 font-mono mt-2">
            Policy: CATALYST_DATA_POLICY.md · Effective: 2026-02-26
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Console warning that fires once per module when a developer
 * tries to import or use a purged mock data source.
 */
const warned = new Set<string>();
export function warnMockDataBan(module: string) {
  if (warned.has(module)) return;
  warned.add(module);
  console.error(
    `%c🚨 CATALYST ZERO-MOCK POLICY 🚨%c\n` +
    `Module "${module}" attempted to use mock/seed data.\n` +
    `This is BANNED. All data must come from the database.\n` +
    `See CATALYST_DATA_POLICY.md for details.`,
    'background: var(--ds-text-danger, #DC2626); color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;',
    'color: var(--ds-text-danger, #DC2626); font-weight: normal;'
  );
}
