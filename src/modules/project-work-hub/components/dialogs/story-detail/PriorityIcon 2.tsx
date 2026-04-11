/**
 * PriorityIcon — Priority level indicator
 */
import React from 'react';
import { ChevronsUp, ChevronUp, ChevronDown, ChevronsDown } from 'lucide-react';

export function PriorityIcon({ priority, size = 16 }: { priority?: string | null; size?: number }) {
  const p = (priority || 'medium').toLowerCase();
  if (p === 'highest' || p === 'critical') return <ChevronsUp size={size} color="#AE2A19" strokeWidth={2.5} style={{ flexShrink: 0 }} />;
  if (p === 'high') return <ChevronUp size={size} color="#DE350B" strokeWidth={2.5} style={{ flexShrink: 0 }} />;
  if (p === 'low') return <ChevronDown size={size} color="#36B37E" strokeWidth={2.5} style={{ flexShrink: 0 }} />;
  if (p === 'lowest') return <ChevronsDown size={size} color="#6B778C" strokeWidth={2.5} style={{ flexShrink: 0 }} />;
  return <span style={{ fontSize: size + 2, fontWeight: 700, color: '#D97706', lineHeight: 1, flexShrink: 0 }}>=</span>;
}
