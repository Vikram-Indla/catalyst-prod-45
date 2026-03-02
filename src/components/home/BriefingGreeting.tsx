/**
 * BriefingGreeting — Personalized greeting with role + project dots.
 */
import React from 'react';
import type { UserContext } from './hooks/useUserContext';

const F = {
  inter: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
  sora: "'Sora', sans-serif",
};

const PROJECT_COLORS: Record<string, string> = {
  BAU: '#4C6EF5', SIMP: '#FA8C16', MDT: '#52C41A', ICP: '#722ED1',
  IP: '#13C2C2', IRP: '#EB2F96', MWR: '#FAAD14', TAH: '#1890FF',
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function BriefingGreeting({ userCtx }: { userCtx: UserContext }) {
  const firstName = userCtx.displayName.split(' ')[0];

  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{
        fontSize: 22, fontWeight: 700, color: '#1A1D23',
        letterSpacing: '-0.02em', margin: 0, fontFamily: F.sora,
      }}>
        {getGreeting()}, {firstName}
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 12, fontWeight: 500, color: '#5E6270',
          fontFamily: F.inter,
        }}>
          {userCtx.role}
        </span>
        <span style={{ width: 1, height: 12, background: '#ECEEF2' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {userCtx.projectKeys.map(pk => (
            <span key={pk} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#5E6270', fontFamily: F.inter }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: PROJECT_COLORS[pk] || '#8B8FA3', flexShrink: 0 }} />
              {pk}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
