import React from 'react';
import { Button } from '@/components/ads';
import { T } from './aiAdminAssistant.types';

function getEnvLabel(): string {
  const host = window.location.hostname;
  if (host.includes('staging')) return 'Staging';
  if (host === 'localhost' || host === '127.0.0.1') return 'Dev';
  return '';
}

interface AiCommandHeaderProps {
  hasMessages: boolean;
  onReset: () => void;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
}

export function AiCommandHeader({ hasMessages, onReset, isSuperAdmin = false }: AiCommandHeaderProps) {
  const env = getEnvLabel();
  const role = isSuperAdmin ? 'Super Admin' : 'Admin';
  const meta = [env, role].filter(Boolean).join(' · ');

  return (
    <div
      style={{
        padding: '20px 24px 16px',
        borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        background: T.surface,
      }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: T.text, lineHeight: '28px' }}>
          AI Admin Assistant
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: T.subtle }}>
          Review and execute admin changes safely. No action runs without your confirmation.
          {meta ? (
            <span style={{ marginLeft: 8, fontSize: 12, color: T.subtlest }}>
              {meta}
            </span>
          ) : null}
        </p>
      </div>
      {hasMessages && (
        <Button appearance="subtle" spacing="compact" onClick={onReset}>
          New session
        </Button>
      )}
    </div>
  );
}
