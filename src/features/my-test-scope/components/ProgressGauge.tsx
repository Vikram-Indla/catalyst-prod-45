/**
 * Progress Gauge Component
 * Circular progress indicator with status breakdown
 * Styled to match dashboard widget pattern: white bg, #E2E8F0 border
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Ban, Circle } from 'lucide-react';
import type { TestScopeSummary } from '../types';

interface ProgressGaugeProps {
  summary: TestScopeSummary;
}

export function ProgressGauge({ summary }: ProgressGaugeProps) {
  const { totalTests, passedTests, failedTests, blockedTests, notRunTests, passRate } = summary;
  
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (passRate / 100) * circumference;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 20,
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 8,
      }}
    >
      <div style={{ position: 'relative', width: 128, height: 128 }}>
        <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="8" />
          <circle
            cx="50" cy="50" r={radius} fill="none"
            stroke="#10B981" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={strokeOffset}
            style={{ transition: 'stroke-dashoffset 500ms ease-out' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', fontFamily: 'Inter, sans-serif' }}>{passRate}%</span>
          <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>{passedTests}/{totalTests}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 16, width: '100%' }}>
        <StatusItem icon={CheckCircle2} count={passedTests} label="Passed" color="#10B981" />
        <StatusItem icon={XCircle} count={failedTests} label="Failed" color="#EF4444" />
        <StatusItem icon={Ban} count={blockedTests} label="Blocked" color="#F59E0B" />
        <StatusItem icon={Circle} count={notRunTests} label="Not Run" color="#94A3B8" />
      </div>
    </div>
  );
}

function StatusItem({ icon: Icon, count, label, color }: {
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  count: number;
  label: string;
  color: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Icon style={{ width: 14, height: 14, color }} />
        <span style={{ fontWeight: 600, color: '#0F172A', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>{count}</span>
      </div>
      <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>{label}</span>
    </div>
  );
}
