// ═══════════════════════════════════════════════════════════
// Resource 360° — Member Detail Page (Stage A: Shell Only)
// Route: /resource360/members/:memberId
// ═══════════════════════════════════════════════════════════

import React from 'react';
import { useParams } from 'react-router-dom';
import type { R360ViewType } from '@/types/resource360';

const Resource360MemberDetail: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();

  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        minHeight: '60vh',
        fontFamily: "'Sora', 'Inter', sans-serif",
      }}
    >
      <div
        style={{
          padding: '40px 48px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          textAlign: 'center',
          maxWidth: 480,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <span style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 700 }}>360</span>
        </div>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#0F172A',
            marginBottom: 8,
            fontFamily: "'Sora', sans-serif",
          }}
        >
          Resource 360° — Member Detail
        </h1>
        <p
          style={{
            fontSize: 14,
            color: '#64748B',
            marginBottom: 4,
          }}
        >
          Member ID: <code style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            background: '#F1F5F9',
            padding: '2px 8px',
            borderRadius: 4,
            color: '#2563EB',
          }}>{memberId}</code>
        </p>
        <p
          style={{
            fontSize: 12,
            color: '#94A3B8',
            marginTop: 12,
          }}
        >
          Ring · Chronology · Board views will be built in Stage C
        </p>
      </div>
    </div>
  );
};

export default Resource360MemberDetail;
