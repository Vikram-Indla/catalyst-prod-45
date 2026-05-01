/**
 * R360 StatusLozenge — V12 Precision
 * Extracted from R360MemberDetail.tsx
 * Exactly 3 states, prioritises status_category
 */
import React from 'react';

function LozengeSpan({ bg, color, label }: { bg: string; color: string; label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: '20px',
      padding: '0 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
      textTransform: 'uppercase' as const, letterSpacing: '0.03em', lineHeight: 1,
      background: bg, color,
    }}>{label}</span>
  );
}

export function StatusLozenge({ status, statusCategory }: { status: string; statusCategory?: string }) {
  // 1. Prioritise Jira's native status_category (always present)
  const cat = (statusCategory || '').toLowerCase().replace(/[_ ]/g, '');
  if (cat === 'done' || cat === 'completed') {
    return <LozengeSpan bg="#1B7F37" color="var(--ds-text-inverse, #FFFFFF)" label="DONE" />;
  }
  if (cat === 'inprogress' || cat === 'indeterminate' || cat === 'started') {
    return <LozengeSpan bg="#0C66E4" color="var(--ds-text-inverse, #FFFFFF)" label="IN PROGRESS" />;
  }
  // cat === 'new' | 'todo' | '' -> fall through to string matching for refined label

  // 2. Fallback: string-match raw status name for label refinement
  const s = (status || '').toLowerCase();
  // Green -- done
  if (['done','approved','completed','resolved','closed','released','verified','ready for production','beta ready','production ready','monitor'].some(k => s === k)) {
    return <LozengeSpan bg="#1B7F37" color="var(--ds-text-inverse, #FFFFFF)" label="DONE" />;
  }
  // Blue -- in progress
  if (['in progress','in review','active','analysis','in development','under implementation','implementation review',
       'code review','ready for qa','in uat','uat ready','technical validation','in qa','in beta','in production',
       'in entity integration','in design','in requirements','ready for development','in testing','end to end testing',
       'retest','re-open','under review','awaiting approval','ready for review','implementation','deferred for int',
       'awaiting info','ready for production'].some(k => s === k)) {
    // Refine label for review-type statuses
    if (['in review','code review','implementation review','ready for qa','in qa','retest','technical validation','end to end testing'].includes(s)) {
      return <LozengeSpan bg="#0C66E4" color="var(--ds-text-inverse, #FFFFFF)" label="IN REVIEW" />;
    }
    return <LozengeSpan bg="#0C66E4" color="var(--ds-text-inverse, #FFFFFF)" label="IN PROGRESS" />;
  }
  // Grey -- to do / waiting (default)
  let label = 'TO DO';
  if (s === 'on hold' || s === 'hold') label = 'ON HOLD';
  else if (s === 'backlog') label = 'BACKLOG';
  else if (s === 'blocked') label = 'BLOCKED';
  else if (s === 'rejected') label = 'REJECTED';
  return <LozengeSpan bg="var(--ds-border, var(--ds-border, #DFE1E6))" color="#42526E" label={label} />;
}

// Also export for chronology view usage
export function getChronologyStatusLozengeColors(status: string, statusCategory?: string): { background: string; color: string } {
  // 1. Prioritise status_category
  const cat = (statusCategory || '').toLowerCase().replace(/[_ ]/g, '');
  if (cat === 'done' || cat === 'completed') return { background: '#1B7F37', color: 'var(--ds-text-inverse, #FFFFFF)' };
  if (cat === 'inprogress' || cat === 'indeterminate' || cat === 'started') return { background: '#0C66E4', color: 'var(--ds-text-inverse, #FFFFFF)' };
  if (cat === 'new' || cat === 'todo') return { background: 'var(--ds-border, var(--ds-border, #DFE1E6))', color: '#42526E' };

  // 2. Fallback: string match
  const s = (status || '').toUpperCase().trim();

  // GREEN: work is finished
  const greenStatuses = ['DONE', 'COMPLETED', 'APPROVED', 'RESOLVED', 'CLOSED', 'RELEASED', 'VERIFIED',
    'READY FOR PRODUCTION', 'BETA READY', 'PRODUCTION READY', 'MONITOR'];
  if (greenStatuses.includes(s)) return { background: '#1B7F37', color: 'var(--ds-text-inverse, #FFFFFF)' };

  // BLUE: work is actively happening
  const blueStatuses = [
    'IN PROGRESS', 'IN REVIEW', 'IN DEVELOPMENT', 'IN TESTING',
    'UNDER IMPLEMENTATION', 'UNDER REVIEW', 'ACTIVE', 'CODE REVIEW',
    'QA', 'UAT', 'AWAITING APPROVAL', 'READY FOR QA', 'READY FOR REVIEW',
    'IMPLEMENTATION', 'IN QA', 'IN UAT', 'UAT READY', 'RETEST', 'RE-OPEN',
    'IN BETA', 'IN PRODUCTION', 'IN DESIGN', 'IN REQUIREMENTS',
    'READY FOR DEVELOPMENT', 'IN ENTITY INTEGRATION', 'TECHNICAL VALIDATION',
    'END TO END TESTING', 'DEFERRED FOR INT', 'AWAITING INFO',
  ];
  if (blueStatuses.includes(s)) return { background: '#0C66E4', color: 'var(--ds-text-inverse, #FFFFFF)' };

  // GREY (default -- never "Unknown")
  return { background: 'var(--ds-border, var(--ds-border, #DFE1E6))', color: '#42526E' };
}
