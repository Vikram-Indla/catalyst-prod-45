/**
 * AttentionSection — "Your Attention Needed" section.
 */
import React from 'react';
import { AttentionCard } from './AttentionCard';
import type { AttentionItem } from './hooks/useAttentionItems';

const F = { inter: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif" };

export function AttentionSection({ items, onItemClick }: { items: AttentionItem[]; onItemClick: (key: string) => void }) {
  if (!items.length) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <span style={{
        fontSize: 10, fontWeight: 700, color: '#8B8FA3',
        textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: F.inter,
      }}>
        YOUR ATTENTION NEEDED
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
        {items.map(item => (
          <AttentionCard key={item.itemKey} item={item} onClick={onItemClick} />
        ))}
      </div>
    </div>
  );
}
