import React from 'react';
import type { Resource360Summary } from '@/types/resource360';

interface Props {
  summary: Resource360Summary | null;
  isLoading: boolean;
}

/** Resource banner with avatar, name, role, department */
export function Resource360Banner({ summary, isLoading }: Props) {
  if (isLoading || !summary) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
        <div className="w-10 h-10 rounded-full bg-slate-200" />
        <div className="flex flex-col gap-1.5">
          <div className="w-32 h-4 rounded bg-slate-200" />
          <div className="w-48 h-3 rounded bg-slate-100" />
        </div>
      </div>
    );
  }

  const initials = summary.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 px-4 py-3" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Avatar */}
      <div
        className="relative rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
        style={{
          width: 40, height: 40,
          background: '#2563EB',
          boxShadow: '0 0 0 3px #DBEAFE',
        }}
      >
        {summary.avatar_url ? (
          <img
            src={summary.avatar_url}
            alt={summary.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <span
          className={`absolute inset-0 flex items-center justify-center text-white font-bold ${summary.avatar_url ? 'hidden' : ''}`}
          style={{ fontSize: 14 }}
        >
          {initials}
        </span>
      </div>

      {/* Name + role */}
      <div className="flex flex-col min-w-0">
        <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--r360-text-1, #0A0A0A)', margin: 0, lineHeight: 1.3 }}>
          {summary.name}
        </p>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--r360-text-2, #1A1A2E)', margin: 0, lineHeight: 1.3 }}>
          {summary.role} · {summary.department}
        </p>
      </div>
    </div>
  );
}
