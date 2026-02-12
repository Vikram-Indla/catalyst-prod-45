/**
 * AI "Start My Day" Card
 * Shows AI-recommended next test with reasons
 * Styled to match dashboard widget pattern: white bg, #E2E8F0 border
 */

import React from 'react';
import { Sparkles, Play, SkipForward } from 'lucide-react';
import { getScoreColor } from '../types';
import type { AIRecommendation } from '../types';

interface AIStartMyDayProps {
  recommendation: AIRecommendation;
  onStartTest: (scopeId: string) => void;
  onSkip: () => void;
}

export function AIStartMyDay({ recommendation, onStartTest, onSkip }: AIStartMyDayProps) {
  const { priorityTest, reasons } = recommendation;

  const cardStyle: React.CSSProperties = {
    flex: 1,
    padding: 20,
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: 8,
    fontFamily: 'Inter, sans-serif',
  };

  if (!priorityTest) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles style={{ width: 16, height: 16, color: '#FFFFFF' }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>AI Start My Day</span>
        </div>
        <p style={{ fontSize: 13, color: '#64748B' }}>
          All tests complete! No pending work in your queue.
        </p>
      </div>
    );
  }

  const scoreColor = getScoreColor(priorityTest.priorityScore);

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles style={{ width: 16, height: 16, color: '#FFFFFF' }} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>AI Start My Day</span>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: '#64748B' }}>Start with</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 32, height: 22, borderRadius: 4, fontSize: 12, fontWeight: 700,
            color: '#FFFFFF', backgroundColor: scoreColor, padding: '0 6px',
          }}>
            {priorityTest.priorityScore}
          </span>
        </div>
        <p style={{ fontWeight: 500, color: '#0F172A', fontSize: 14, margin: 0 }}>
          {priorityTest.key} — {priorityTest.title}
        </p>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px 0' }}>
        {reasons.map((reason, index) => (
          <li key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 13, color: '#64748B', marginBottom: 4 }}>
            <span style={{ color: '#2563EB' }}>•</span>
            {reason}
          </li>
        ))}
      </ul>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => onStartTest(priorityTest.scopeId)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 32, padding: '0 14px', fontSize: 13, fontWeight: 500,
            color: '#FFFFFF', background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
            border: 'none', borderRadius: 6, cursor: 'pointer',
          }}
        >
          <Play style={{ width: 13, height: 13 }} /> Start This Test
        </button>
        <button
          onClick={onSkip}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 32, padding: '0 12px', fontSize: 13, fontWeight: 500,
            color: '#64748B', background: 'transparent',
            border: 'none', borderRadius: 6, cursor: 'pointer',
          }}
        >
          <SkipForward style={{ width: 13, height: 13 }} /> Skip
        </button>
      </div>
    </div>
  );
}
