import React from 'react';
import { Lozenge, Button } from '@/components/ads';
import { T } from './aiAdminAssistant.types';

function getEnvLabel(): { label: string; appearance: 'default' | 'new' | 'moved' | 'removed' } {
  const host = window.location.hostname;
  if (host.includes('staging')) return { label: 'Staging', appearance: 'moved' };
  if (host === 'localhost' || host === '127.0.0.1') return { label: 'Dev', appearance: 'default' };
  return { label: 'Production', appearance: 'removed' };
}

interface AiCommandHeaderProps {
  hasMessages: boolean;
  onReset: () => void;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
}

export function AiCommandHeader({ hasMessages, onReset, isAdmin = true, isSuperAdmin = false }: AiCommandHeaderProps) {
  const env = getEnvLabel();

  return (
    <div
      style={{
        padding: '16px 24px 14px',
        borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: T.surface,
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: T.text, lineHeight: '24px' }}>
            AI Admin Assistant
          </h1>
          <span style={{ display: 'inline-block' }}>
            <Lozenge appearance={env.appearance}>{env.label}</Lozenge>
          </span>
          <span style={{ display: 'inline-block' }}>
            <Lozenge appearance="moved">Confirmation required</Lozenge>
          </span>
          <span style={{ display: 'inline-block' }}>
            <Lozenge appearance={isSuperAdmin ? 'removed' : 'inprogress'} isBold>
              {isSuperAdmin ? 'Super Admin' : 'Admin'}
            </Lozenge>
          </span>
        </div>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: T.subtle }}>
          Review and execute admin changes safely. No action runs without your confirmation.
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
