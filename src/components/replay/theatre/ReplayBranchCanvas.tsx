import React, { useRef, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TheatreScript, TheatreCharacter } from '@/lib/replay/theatre/theatreTypes';

// ─── Layout constants ─────────────────────────────────────────────────────────

const NODE_W = 180;
const NODE_H = 44;
const LEVEL_GAP_Y = 110;
const SIBLING_GAP_Y = 70;
const CANVAS_PADDING_LEFT = 60;
const CANVAS_PADDING_TOP = 60;
const MIN_TIME_SCALE = 2;

// ─── Type color map ───────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  'Business Request': '#FF8B00',
  Epic: '#6554C0',
  Feature: '#00875A',
  Story: '#0052CC',
  'QA Bug': '#AE2A19',
  'Production Incident': '#AE2A19',
  'Change Request': '#FF8B00',
  'Business Gap': '#FF5630',
};

// ─── Status segment color ─────────────────────────────────────────────────────

function segmentColor(category: string): string {
  if (category === 'Done') return '#ABF5D1';
  if (category === 'In Progress') return '#B3D4FF';
  return '#DFE1E6';
}

// ─── Layout computation ───────────────────────────────────────────────────────

interface NodePosition {
  x: number;
  y: number;
  character: TheatreCharacter;
}

function computeLayout(
  characters: TheatreCharacter[],
  scriptStart: Date,
  timeScale: number,
): NodePosition[] {
  // Group by hierarchy level
  const byLevel = new Map<number, TheatreCharacter[]>();
  for (const c of characters) {
    const lvl = c.hierarchyLevel;
    if (!byLevel.has(lvl)) byLevel.set(lvl, []);
    byLevel.get(lvl)!.push(c);
  }

  // Group siblings by parent for sibling index
  const siblingIndexByKey = new Map<string, number>();
  const siblingsSeenByParent = new Map<string | null, number>();
  // Sort by createdAt then assign sibling index per parent
  const sorted = [...characters].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const c of sorted) {
    const parentKey = c.parentKey;
    const idx = siblingsSeenByParent.get(parentKey) ?? 0;
    siblingIndexByKey.set(c.key, idx);
    siblingsSeenByParent.set(parentKey, idx + 1);
  }

  return characters.map((c) => {
    const createdMs = new Date(c.createdAt).getTime();
    const startMs = scriptStart.getTime();
    const daysSinceStart = Math.max(0, (createdMs - startMs) / 86400000);

    const x = CANVAS_PADDING_LEFT + daysSinceStart * timeScale;
    const siblingIdx = siblingIndexByKey.get(c.key) ?? 0;
    const y =
      CANVAS_PADDING_TOP +
      c.hierarchyLevel * LEVEL_GAP_Y +
      siblingIdx * SIBLING_GAP_Y;

    return { x, y, character: c };
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function totalDays(c: TheatreCharacter): number {
  const end = c.completedAt ?? new Date().toISOString();
  return Math.max(
    1,
    Math.ceil((new Date(end).getTime() - new Date(c.createdAt).getTime()) / 86400000),
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ReplayBranchCanvasProps {
  script: TheatreScript;
  revealedKeys: Set<string>;
  focusKey: string | null;
  phase: 'opening' | 'story' | 'final-map' | 'credits';
  zoom: 'week' | 'month';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReplayBranchCanvas({
  script,
  revealedKeys,
  focusKey,
  phase,
}: ReplayBranchCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(900);

  // Measure container width for dynamic time scale
  useEffect(() => {
    if (!wrapperRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setContainerWidth(w);
    });
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  const scriptStart = useMemo(
    () =>
      new Date(
        [...script.characters].sort((a, b) =>
          a.createdAt.localeCompare(b.createdAt),
        )[0]?.createdAt ?? new Date().toISOString(),
      ),
    [script.characters],
  );

  // Total days span of the entire script
  const totalScriptDays = useMemo(() => {
    if (script.characters.length === 0) return 180;
    const latestMs = Math.max(
      ...script.characters.map((c) =>
        new Date(c.completedAt ?? new Date().toISOString()).getTime(),
      ),
    );
    return Math.max(1, Math.ceil((latestMs - scriptStart.getTime()) / 86400000));
  }, [script.characters, scriptStart]);

  // Dynamic time scale: fill the container width minus padding
  const timeScale = useMemo(() => {
    const available = containerWidth - CANVAS_PADDING_LEFT * 2 - NODE_W - 40;
    return Math.max(MIN_TIME_SCALE, available / totalScriptDays);
  }, [containerWidth, totalScriptDays]);

  const allPositions = useMemo(
    () => computeLayout(script.characters, scriptStart, timeScale),
    [script.characters, scriptStart, timeScale],
  );

  const positionMap = useMemo(() => {
    const m = new Map<string, NodePosition>();
    for (const p of allPositions) m.set(p.character.key, p);
    return m;
  }, [allPositions]);

  const revealedPositions = useMemo(
    () => allPositions.filter((p) => revealedKeys.has(p.character.key)),
    [allPositions, revealedKeys],
  );

  // Compute canvas bounding box
  const canvasW = useMemo(() => {
    if (revealedPositions.length === 0) return containerWidth;
    const maxX = Math.max(...revealedPositions.map((p) => p.x + NODE_W + totalDays(p.character) * timeScale + 40));
    return Math.max(maxX, containerWidth);
  }, [revealedPositions, containerWidth, timeScale]);

  const canvasH = useMemo(() => {
    if (revealedPositions.length === 0) return 400;
    const maxY = Math.max(...revealedPositions.map((p) => p.y + NODE_H + 20));
    return Math.max(maxY, 400);
  }, [revealedPositions]);

  // Auto-scroll to focused item
  useEffect(() => {
    if (!focusKey || !wrapperRef.current) return;
    const pos = positionMap.get(focusKey);
    if (!pos) return;
    wrapperRef.current.scrollTo({
      left: Math.max(0, pos.x - 100),
      top: Math.max(0, pos.y - 80),
      behavior: 'smooth',
    });
  }, [focusKey, positionMap]);

  const hasFocus = focusKey !== null && revealedKeys.has(focusKey ?? '');

  if (phase === 'credits') {
    return null;
  }

  return (
    <div
      ref={wrapperRef}
      style={{
        flex: 1,
        overflow: 'auto',
        background: '#F0F2F5',
        position: 'relative',
      }}
    >
      <svg
        width={canvasW}
        height={canvasH}
        style={{ display: 'block', minWidth: '100%', minHeight: '100%' }}
      >
        {/* Grid lines — week markers */}
        {Array.from({ length: Math.ceil(canvasW / (timeScale * 7)) }, (_, i) => {
          const xPos = CANVAS_PADDING_LEFT + i * 7 * timeScale;
          return (
            <line
              key={`grid-${i}`}
              x1={xPos}
              y1={0}
              x2={xPos}
              y2={canvasH}
              stroke="#DFE1E6"
              strokeWidth={1}
              strokeDasharray="3 4"
              opacity={0.5}
            />
          );
        })}

        {/* Connection paths (parent → child) */}
        {revealedPositions.map(({ character, x, y }) => {
          if (!character.parentKey) return null;
          const parentPos = positionMap.get(character.parentKey);
          if (!parentPos || !revealedKeys.has(character.parentKey)) return null;

          const px = parentPos.x + NODE_W;
          const py = parentPos.y + NODE_H / 2;
          const cx2 = x;
          const cy2 = y + NODE_H / 2;

          const d = `M ${px} ${py} C ${px + 40} ${py} ${cx2 - 40} ${cy2} ${cx2} ${cy2}`;
          const isFocused =
            character.key === focusKey || character.parentKey === focusKey;
          const dimmed = hasFocus && !isFocused;

          return (
            <motion.path
              key={`path-${character.key}`}
              d={d}
              fill="none"
              stroke={isFocused ? '#2E63D5' : '#C1C7D0'}
              strokeWidth={isFocused ? 2 : 1.5}
              opacity={dimmed ? 0.15 : 0.8}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          );
        })}

        {/* Nodes */}
        <AnimatePresence>
          {revealedPositions.map(({ character, x, y }) => {
            const typeColor = TYPE_COLORS[character.type] ?? '#6B778C';
            const isFocused = character.key === focusKey;
            const dimmed = hasFocus && !isFocused;
            const lifelineDays = totalDays(character);
            const lifelineW = lifelineDays * timeScale;

            // Build segment widths
            let segOffset = 0;
            const segs = character.segments.map((seg) => {
              const dur = seg.durationDays ?? lifelineDays;
              const w = Math.max(4, dur * timeScale);
              const result = { seg, x: segOffset, w };
              segOffset += w;
              return result;
            });

            const totalSegW = Math.max(lifelineW, segOffset);

            return (
              <motion.g
                key={character.key}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: dimmed ? 0.25 : 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                style={{ transformOrigin: `${x + NODE_W / 2}px ${y + NODE_H / 2}px` }}
              >
                {/* Drop-shadow for focus */}
                {isFocused && (
                  <rect
                    x={x - 3}
                    y={y - 3}
                    width={NODE_W + 6}
                    height={NODE_H + 6}
                    rx={8}
                    fill="none"
                    stroke="#2E63D5"
                    strokeWidth={2}
                    opacity={0.6}
                    style={{ filter: 'blur(3px)' }}
                  />
                )}

                {/* Node card background */}
                <rect
                  x={x}
                  y={y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={6}
                  fill="white"
                  stroke={isFocused ? '#2E63D5' : '#DFE1E6'}
                  strokeWidth={isFocused ? 1.5 : 1}
                />

                {/* Left type color bar */}
                <rect
                  x={x}
                  y={y}
                  width={4}
                  height={NODE_H}
                  rx={6}
                  fill={typeColor}
                />
                <rect x={x + 2} y={y} width={2} height={NODE_H} fill={typeColor} />

                {/* Key (bold, small) */}
                <text
                  x={x + 12}
                  y={y + 16}
                  fontSize={10}
                  fontWeight={700}
                  fill={typeColor}
                  fontFamily="'Atlassian Sans', ui-sans-serif, system-ui, sans-serif"
                >
                  {character.key}
                </text>

                {/* Scope-creep badge */}
                {character.isScopeCreep && (
                  <text
                    x={x + NODE_W - 6}
                    y={y + 15}
                    fontSize={9}
                    fill="#FF5630"
                    textAnchor="end"
                    fontFamily="'Atlassian Sans', ui-sans-serif, system-ui, sans-serif"
                  >
                    +scope
                  </text>
                )}

                {/* Title (truncated) */}
                <text
                  x={x + 12}
                  y={y + 30}
                  fontSize={11}
                  fill="var(--ds-text, #172B4D)"
                  fontFamily="'Atlassian Sans', ui-sans-serif, system-ui, sans-serif"
                >
                  {truncate(character.title, 22)}
                </text>

                {/* Life line */}
                <rect
                  x={x + NODE_W}
                  y={y + NODE_H / 2 - 3}
                  width={totalSegW}
                  height={6}
                  rx={3}
                  fill="#DFE1E6"
                />

                {/* Status segments on life line */}
                {segs.map(({ seg, x: sxOffset, w }) => (
                  <motion.rect
                    key={`seg-${character.key}-${seg.startAt}`}
                    x={x + NODE_W + sxOffset}
                    y={y + NODE_H / 2 - 3}
                    width={w}
                    height={6}
                    rx={2}
                    fill={segmentColor(seg.category)}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    style={{ transformOrigin: `${x + NODE_W + sxOffset}px ${y + NODE_H / 2}px` }}
                  />
                ))}

                {/* Completion marker */}
                {character.completedAt && (
                  <motion.circle
                    cx={x + NODE_W + totalSegW}
                    cy={y + NODE_H / 2}
                    r={5}
                    fill="#00875A"
                    stroke="white"
                    strokeWidth={1.5}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.6 }}
                  />
                )}

                {/* Regression arcs */}
                {character.regressions.map((reg, ri) => {
                  const regDays = reg.durationDays ?? 14;
                  const arcW = regDays * timeScale;
                  const arcX = x + NODE_W + Math.max(0, (totalSegW / 2) - arcW / 2);
                  const arcY = y + NODE_H / 2 + 3;
                  const arcColor = reg.isBoomerang ? '#FFD700' : '#FF8B00';
                  // Simple arc path dipping below
                  const d = `M ${arcX} ${arcY} Q ${arcX + arcW / 2} ${arcY + 18} ${arcX + arcW} ${arcY}`;
                  return (
                    <motion.path
                      key={`reg-${character.key}-${ri}`}
                      d={d}
                      fill="none"
                      stroke={arcColor}
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.7, ease: 'easeInOut' }}
                    />
                  );
                })}

                {/* Milestone markers */}
                {character.milestones.map((ms, mi) => {
                  // Compute x position of milestone relative to node start
                  const msDay = Math.max(
                    0,
                    (new Date(ms.at).getTime() - new Date(character.createdAt).getTime()) / 86400000,
                  );
                  const msX = x + NODE_W + msDay * timeScale;
                  const isRelease = ms.type === 'release_assigned' || ms.type === 'release_date';
                  return (
                    <g key={`ms-${character.key}-${mi}`}>
                      <line
                        x1={msX}
                        y1={y + 4}
                        x2={msX}
                        y2={y + NODE_H - 4}
                        stroke={isRelease ? '#AE2A19' : '#0052CC'}
                        strokeWidth={1.5}
                        strokeDasharray={isRelease ? undefined : '2 2'}
                        opacity={0.6}
                      />
                      {isRelease && (
                        <polygon
                          points={`${msX},${y - 2} ${msX + 4},${y + 5} ${msX},${y + 12} ${msX - 4},${y + 5}`}
                          fill="#AE2A19"
                          opacity={0.7}
                        />
                      )}
                    </g>
                  );
                })}

                {/* Current assignee avatar on life line */}
                {(() => {
                  const lastSeg = character.segments[character.segments.length - 1];
                  const assignee = lastSeg?.assignee;
                  if (!assignee) return null;
                  const avX = x + NODE_W + totalSegW - 10;
                  const avY = y + NODE_H / 2 - 9;
                  return (
                    <g>
                      <circle cx={avX} cy={avY} r={8} fill={assignee.color} stroke="white" strokeWidth={1.5} />
                      <text
                        x={avX}
                        y={avY + 3}
                        textAnchor="middle"
                        fontSize={6}
                        fill="white"
                        fontWeight={700}
                        fontFamily="'Atlassian Sans', ui-sans-serif, system-ui, sans-serif"
                      >
                        {assignee.initials}
                      </text>
                    </g>
                  );
                })()}
              </motion.g>
            );
          })}
        </AnimatePresence>
      </svg>
    </div>
  );
}
