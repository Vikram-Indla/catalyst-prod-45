/**
 * CatalystKanbanCard — Hub-agnostic Kanban card.
 *
 * Operates on the canonical `KanbanCardData` shape so Product, Incident,
 * Team and Project hubs all render identically. Mirrors the Jira-parity
 * card anatomy established in WorkItemCard.tsx:
 *
 *   ┌─────────────────────────────────────────────┐
 *   │ Title (2-line clamp)          🚩  …       │
 *   │ [PRIMARY LOZENGE] [Secondary lozenge]       │
 *   │ type • KEY-42                    ■■■  [AV]  │
 *   └─────────────────────────────────────────────┘
 *
 * The card reads ONLY from KanbanCardData. Hub-specific slots are
 * exposed via `renderFooter` so initiative-specific chrome (progress,
 * risk count, incident severity) can appear without coupling the
 * primitive to any one hub.
 */
import { memo, useEffect, useRef, useState } from 'react';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { attachClosestEdge, extractClosestEdge, type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import Lozenge from '@atlaskit/lozenge';
import { Flag } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { PriorityBars, normalisePriority } from '@/components/shared/PriorityIndicator';
import { KanbanAvatar } from './KanbanAvatar';
import type { KanbanCardData } from './catalyst-types';
import type { KanbanThemeTokens, DensityConfig } from './kanban-tokens';

interface CatalystKanbanCardProps {
  card: KanbanCardData;
  columnId: string;
  avatarUrl?: string | null;
  onClick: () => void;
  d: DensityConfig;
  tk: KanbanThemeTokens;
  isSelected?: boolean;
  isFocused?: boolean;
  renderFooter?: (card: KanbanCardData) => React.ReactNode;
}

export const CatalystKanbanCard = memo(function CatalystKanbanCard({
  card, columnId, avatarUrl, onClick, d, tk, isSelected, isFocused, renderFooter,
}: CatalystKanbanCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return draggable({
      element: el,
      getInitialData: () => ({ type: 'catalyst-card', cardId: card.id, columnId }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });
  }, [card.id, columnId]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return dropTargetForElements({
      element: el,
      canDrop: ({ source }) => source.data.type === 'catalyst-card' && source.data.cardId !== card.id,
      getData: ({ input, element }) =>
        attachClosestEdge(
          { type: 'catalyst-card', cardId: card.id, columnId },
          { input, element, allowedEdges: ['top', 'bottom'] },
        ),
      getIsSticky: () => true,
      onDragEnter: (args) => setClosestEdge(extractClosestEdge(args.self.data)),
      onDrag: (args) => setClosestEdge(extractClosestEdge(args.self.data)),
      onDragLeave: () => setClosestEdge(null),
      onDrop: () => setClosestEdge(null),
    });
  }, [card.id, columnId]);

  const focusShadow = `0 0 0 2px ${tk.selectedAccent}`;
  const restShadow = tk.cardShadowRest;
  const hoverShadow = tk.cardHoverShadow;

  const cardStyle: React.CSSProperties = {
    background: tk.cardBg,
    borderRadius: 4,
    border: 'none',
    borderLeft: isSelected ? `3px solid ${tk.selectedAccent}` : 'none',
    padding: d.cardPad,
    display: 'flex',
    flexDirection: 'column',
    cursor: 'grab',
    transition: 'background 150ms ease, box-shadow 150ms ease, border-left 120ms ease',
    opacity: isDragging ? 0.35 : 1,
    boxShadow: isDragging ? tk.cardDragShadow : isFocused ? focusShadow : restShadow,
    position: 'relative',
    outline: 'none',
    overflow: 'visible',
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={ref}
        style={cardStyle}
        onClick={() => { if (!isDragging) onClick(); }}
        onMouseEnter={(e) => {
          if (!isDragging) {
            e.currentTarget.style.background = tk.cardHoverBg;
            e.currentTarget.style.boxShadow = hoverShadow;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = tk.cardBg;
          e.currentTarget.style.boxShadow = isDragging ? tk.cardDragShadow : isFocused ? focusShadow : restShadow;
        }}
        tabIndex={-1}
        role="listitem"
        aria-label={`${card.key}: ${card.title}`}
        aria-selected={isSelected}
        aria-grabbed={isDragging}
        data-card-id={card.id}
      >
        {/* ─── TITLE ROW ─── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
          <div style={{
            flex: 1, minWidth: 0,
            fontSize: d.titleSize,
            lineHeight: `${d.titleSize + 6}px`,
            color: tk.textPrimary,
            fontWeight: 400,
            display: '-webkit-box',
            WebkitLineClamp: d.titleClamp,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word',
            fontFamily: "'Inter', sans-serif",
          }}>
            {card.title}
          </div>
          {card.flagged && <Flag size={12} color="#E5493A" fill="#E5493A" style={{ marginTop: 2, flexShrink: 0 }} />}
        </div>

        {/* ─── LOZENGE ROW ─── */}
        {(card.primaryLozenge || card.secondaryLozenge) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {card.primaryLozenge && (
              <Lozenge appearance={card.primaryLozenge.appearance ?? 'default'} isBold maxWidth={240}>
                {card.primaryLozenge.label}
              </Lozenge>
            )}
            {card.secondaryLozenge && (
              <Lozenge appearance={card.secondaryLozenge.appearance ?? 'default'} maxWidth={200}>
                {card.secondaryLozenge.label}
              </Lozenge>
            )}
          </div>
        )}

        {/* ─── OPTIONAL FOOTER SLOT ─── */}
        {renderFooter && (
          <div style={{ marginTop: 6 }}>
            {renderFooter(card)}
          </div>
        )}

        {/* ─── FOOTER: Type + Key (left) · Priority + Avatar (right) ─── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          minHeight: d.footerHeight, marginTop: 6,
        }}>
          <JiraIssueTypeIcon type={card.type} size={14} />
          <span style={{
            fontSize: d.metaSize + 1, fontWeight: 500,
            color: tk.textMuted, fontFamily: "'JetBrains Mono', monospace",
            lineHeight: '14px',
          }}>{card.key}</span>
          {card.metaText && (
            <span style={{
              fontSize: d.metaSize, color: tk.textMuted,
              fontFamily: "'Inter', sans-serif", marginLeft: 4,
            }}>{card.metaText}</span>
          )}
          <span style={{ flex: 1 }} />
          {card.priority && (
            <PriorityBars priority={normalisePriority(card.priority)} />
          )}
          <KanbanAvatar name={card.assigneeName} url={avatarUrl} size={d.avatarSize} tk={tk} />
        </div>
      </div>
      {closestEdge && <DropIndicator edge={closestEdge} gap="4px" />}
    </div>
  );
});
