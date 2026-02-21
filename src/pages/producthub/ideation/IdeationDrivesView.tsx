/**
 * IdeationDrivesView — Innovation Drives with progress tracking
 */
import React from 'react';
import { Plus } from 'lucide-react';

const MONO = "'JetBrains Mono', monospace";

interface Drive {
  emoji: string;
  title: string;
  status: 'active' | 'draft';
  description: string;
  submitted: number;
  deadline: string;
  target: number;
  ideas: string[];
}

const DRIVES: Drive[] = [
  {
    emoji: '🏛️', title: 'V2030 Digital Government Acceleration', status: 'active',
    description: 'Fast-track ideas aligned with Vision 2030 digital government transformation pillars. Focus on citizen-facing services and data-driven governance.',
    submitted: 4, deadline: 'Mar 31, 2026', target: 10,
    ideas: ['IDH-001', 'IDH-005', 'IDH-011', 'IDH-013'],
  },
  {
    emoji: '🤖', title: 'AI & Automation Innovation Sprint', status: 'active',
    description: 'Submit ideas leveraging AI, machine learning, and automation to improve ministry operations and reduce manual processes.',
    submitted: 3, deadline: 'Apr 15, 2026', target: 8,
    ideas: ['IDH-002', 'IDH-004', 'IDH-015'],
  },
  {
    emoji: '🌱', title: 'Sustainability & ESG Compliance', status: 'draft',
    description: 'Ideas focused on environmental sustainability, ESG reporting, and carbon footprint reduction aligned with Saudi Green Initiative.',
    submitted: 1, deadline: 'May 1, 2026', target: 5,
    ideas: ['IDH-014'],
  },
];

export default function IdeationDrivesView() {
  return (
    <div style={{ padding: '16px 28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px', margin: 0 }}>Innovation Drives</h2>
            <span style={{
              background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px',
              padding: '1px 7px', fontSize: '11px', fontWeight: 600,
              fontFamily: MONO, color: '#94A3B8',
            }}>3</span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
            Themed innovation campaigns to focus idea generation around strategic priorities
          </p>
        </div>
        <button style={{
          background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px',
          padding: '7px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: '6px',
        }}>
          <Plus size={14} /> New Drive
        </button>
      </div>

      {/* Drive Cards */}
      {DRIVES.map(drive => {
        const pct = Math.round((drive.submitted / drive.target) * 100);
        const isActive = drive.status === 'active';
        return (
          <div key={drive.title} style={{
            background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px',
            padding: '20px', marginBottom: '16px',
          }}>
            {/* Title + Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '20px' }}>{drive.emoji}</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', flex: 1 }}>{drive.title}</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: isActive ? '#DCFCE7' : '#F4F4F5',
                color: isActive ? '#15803D' : '#71717A',
                padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isActive ? '#16A34A' : '#A1A1AA' }} />
                {isActive ? 'Active' : 'Draft'}
              </span>
            </div>

            {/* Description */}
            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 12px', lineHeight: 1.5 }}>{drive.description}</p>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '24px', fontSize: '12px', color: '#334155', fontWeight: 500, marginBottom: '10px' }}>
              <span><strong>{drive.submitted}</strong> ideas submitted</span>
              <span>Deadline: <strong>{drive.deadline}</strong></span>
              <span>Target: <strong>{drive.target}</strong> ideas</span>
            </div>

            {/* Progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ flex: 1, height: '8px', background: '#E4E4E7', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`, height: '100%',
                  background: isActive ? '#16A34A' : '#94A3B8', borderRadius: '4px',
                  transition: 'width 0.3s',
                }} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                {drive.submitted}/{drive.target}
              </span>
            </div>

            {/* Linked ideas */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, marginRight: '4px' }}>Ideas:</span>
              {drive.ideas.map(key => (
                <span key={key} style={{
                  fontFamily: MONO, fontSize: '11px', fontWeight: 600, color: '#2563EB',
                  background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: '4px', padding: '1px 6px',
                }}>{key}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
