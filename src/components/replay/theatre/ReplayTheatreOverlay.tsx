import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import type { TheatreScript, TheatreEvent, TheatreCharacter, TheatrePerson } from '@/lib/replay/theatre/theatreTypes';
import { buildTheatreEvents } from '@/lib/replay/theatre/eventEngine';
import { ReplayBranchCanvas } from './ReplayBranchCanvas';
import { ReplayCredits } from './ReplayCredits';

// ─── Constants ────────────────────────────────────────────────────────────────

const BRAND = '#2E63D5';
const OPENING_DELAY_MS = 3000;

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'opening' | 'story' | 'final-map' | 'credits';
type Speed = 1 | 2;
type Zoom = 'week' | 'month';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return isoDate.split('T')[0];
  }
}

function extractCharacterKeys(event: TheatreEvent): string[] {
  const keys: string[] = [];
  if (event.character) keys.push(event.character.key);
  return keys;
}

function extractPersonIds(event: TheatreEvent): string[] {
  const ids: string[] = [];
  if (event.person) ids.push(event.person.id);
  if (event.fromPerson) ids.push(event.fromPerson.id);
  if (event.toPerson) ids.push(event.toPerson.id);
  return ids;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ person, size = 28 }: { person: TheatrePerson; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: person.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: size * 0.32,
        fontWeight: 700,
        color: 'white',
        fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {person.initials}
    </div>
  );
}

// ─── Control button ───────────────────────────────────────────────────────────

function CtrlBtn({
  label,
  title,
  onClick,
  disabled,
  active,
  small,
}: {
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  small?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: small ? '4px 8px' : '6px 10px',
        borderRadius: 4,
        border: active ? `1.5px solid ${BRAND}` : '1px solid var(--ds-border, #DFE1E6)',
        background: active ? '#EAF0FB' : 'var(--ds-surface, #FFFFFF)',
        color: active ? BRAND : disabled ? '#C1C7D0' : 'var(--ds-text, #172B4D)',
        fontSize: small ? 12 : 14,
        fontWeight: active ? 600 : 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
        lineHeight: 1,
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

// ─── Opening phase ────────────────────────────────────────────────────────────

function OpeningPhase({
  script,
  onStart,
}: {
  script: TheatreScript;
  onStart: () => void;
}) {
  const [readyToStart, setReadyToStart] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReadyToStart(true), OPENING_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (readyToStart) {
      const t = setTimeout(onStart, 1200);
      return () => clearTimeout(t);
    }
  }, [readyToStart, onStart]);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 24,
        background: '#F0F2F5',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.82 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
      >
        {/* Root item icon + key */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <JiraIssueTypeIcon type={script.rootType} size={28} />
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: BRAND,
              fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
              letterSpacing: '-0.01em',
            }}
          >
            {script.rootKey}
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: 'var(--ds-text, #172B4D)',
            fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
            textAlign: 'center',
            maxWidth: 480,
            lineHeight: 1.3,
          }}
        >
          {script.rootTitle}
        </div>

        {/* Period */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          style={{
            fontSize: 14,
            color: 'var(--ds-text-subtle, #42526E)',
            fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
          }}
        >
          {script.period}
        </motion.div>

        {/* Stats chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}
        >
          {[
            `${script.characters.length} items`,
            `${script.people.length} contributors`,
            `${script.stats.totalDays} days`,
            `${script.stats.regressions + script.stats.boomerangs} regressions`,
          ].map((chip) => (
            <span
              key={chip}
              style={{
                padding: '4px 12px',
                borderRadius: 20,
                background: 'var(--ds-surface, #FFFFFF)',
                border: '1px solid var(--ds-border, #DFE1E6)',
                fontSize: 12,
                color: 'var(--ds-text-subtle, #42526E)',
                fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
              }}
            >
              {chip}
            </span>
          ))}
        </motion.div>

        {/* Loading / Start button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.5 }}
        >
          {readyToStart ? (
            <button
              onClick={onStart}
              style={{
                padding: '10px 28px',
                borderRadius: 4,
                border: 'none',
                background: BRAND,
                color: 'white',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
              }}
            >
              ▶ Starting…
            </button>
          ) : (
            <div
              style={{
                fontSize: 13,
                color: 'var(--ds-text-subtlest, #6B778C)',
                fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
              }}
            >
              Loading story…
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

// ─── Character rail (left panel — items + contributors only) ─────────────────

function CharacterRail({
  script,
  revealedKeys,
  revealedPersonIds,
  focusKey,
  collapsed,
  onToggleCollapse,
}: {
  script: TheatreScript;
  revealedKeys: Set<string>;
  revealedPersonIds: Set<string>;
  focusKey: string | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const revealedChars = useMemo(
    () => script.characters.filter((c) => revealedKeys.has(c.key)),
    [script.characters, revealedKeys],
  );

  const revealedPeople = useMemo(
    () => script.people.filter((p) => revealedPersonIds.has(p.id)),
    [script.people, revealedPersonIds],
  );

  return (
    <div
      style={{
        width: collapsed ? 0 : 220,
        flexShrink: 0,
        background: 'var(--ds-surface, #FFFFFF)',
        borderRight: collapsed ? 'none' : '1px solid var(--ds-border, #DFE1E6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.25s ease',
        position: 'relative',
      }}
    >
      {!collapsed && (
        <>
          {/* Section header with collapse button */}
          <div
            style={{
              padding: '10px 10px 6px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--ds-border, #DFE1E6)',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--ds-text-subtlest, #6B778C)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.06em',
                fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
              }}
            >
              Items · {revealedChars.length}
            </span>
            <button
              onClick={onToggleCollapse}
              title="Hide panel"
              style={{
                padding: '2px 6px',
                border: '1px solid var(--ds-border, #DFE1E6)',
                borderRadius: 3,
                background: 'transparent',
                color: 'var(--ds-text-subtlest, #6B778C)',
                fontSize: 11,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ◀
            </button>
          </div>

          {/* Items list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            <AnimatePresence>
              {revealedChars.map((char) => {
                const isFocused = char.key === focusKey;
                return (
                  <motion.div
                    key={char.key}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '5px 12px',
                      borderLeft: isFocused ? `3px solid ${BRAND}` : '3px solid transparent',
                      background: isFocused ? '#EAF0FB' : 'transparent',
                    }}
                  >
                    <JiraIssueTypeIcon type={char.type} size={14} />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: BRAND,
                          fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {char.key}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--ds-text-subtle, #42526E)',
                          fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: 160,
                        }}
                      >
                        {char.title}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Contributors */}
            {revealedPeople.length > 0 && (
              <>
                <div
                  style={{
                    padding: '10px 12px 6px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--ds-text-subtlest, #6B778C)',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.06em',
                    fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
                    borderTop: '1px solid var(--ds-border, #DFE1E6)',
                    marginTop: 6,
                  }}
                >
                  Contributors · {revealedPeople.length}
                </div>
                <AnimatePresence>
                  {revealedPeople.map((person) => (
                    <motion.div
                      key={person.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px' }}
                    >
                      <Avatar person={person} size={22} />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'var(--ds-text, #172B4D)',
                            fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {person.name}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: 'var(--ds-text-subtlest, #6B778C)',
                            fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
                          }}
                        >
                          {person.roles[0]}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Narration rail (right panel — event story) ───────────────────────────────

function NarrationRail({
  currentEvent,
  leftCollapsed,
  onExpandLeft,
}: {
  currentEvent: TheatreEvent | null;
  leftCollapsed: boolean;
  onExpandLeft: () => void;
}) {
  return (
    <div
      style={{
        width: 260,
        flexShrink: 0,
        background: 'var(--ds-surface, #FFFFFF)',
        borderLeft: '1px solid var(--ds-border, #DFE1E6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header row */}
      <div
        style={{
          padding: '10px 12px 8px',
          borderBottom: '1px solid var(--ds-border, #DFE1E6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--ds-text-subtlest, #6B778C)',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.06em',
            fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
          }}
        >
          Now Playing
        </span>
        {leftCollapsed && (
          <button
            onClick={onExpandLeft}
            title="Show items panel"
            style={{
              padding: '2px 6px',
              border: '1px solid var(--ds-border, #DFE1E6)',
              borderRadius: 3,
              background: 'transparent',
              color: 'var(--ds-text-subtlest, #6B778C)',
              fontSize: 11,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ▶ Items
          </button>
        )}
      </div>

      {/* Event narrative */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
        <AnimatePresence mode="wait">
          {currentEvent ? (
            <motion.div
              key={currentEvent.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              style={{ padding: '14px 14px 16px' }}
            >
              {/* Date — prominent */}
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: BRAND,
                  fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
                  marginBottom: 6,
                  letterSpacing: '0.02em',
                }}
              >
                {formatDate(currentEvent.date)}
              </div>

              {/* Headline — large, dark, readable */}
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--ds-text, #172B4D)',
                  fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
                  lineHeight: 1.45,
                  marginBottom: 12,
                }}
              >
                {currentEvent.headline}
              </div>

              {/* Bullets — clear dark text */}
              {currentEvent.bullets.map((b, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 12,
                    color: 'var(--ds-text-subtle, #42526E)',
                    fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
                    lineHeight: 1.6,
                    paddingLeft: 10,
                    position: 'relative',
                  }}
                >
                  <span style={{ position: 'absolute', left: 0, color: BRAND }}>·</span>
                  {b}
                </div>
              ))}

              {/* Why it matters — italic, visible */}
              {currentEvent.whyItMatters && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--ds-text-subtle, #42526E)',
                    fontStyle: 'italic',
                    fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
                    lineHeight: 1.5,
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: '1px solid var(--ds-border, #DFE1E6)',
                  }}
                >
                  {currentEvent.whyItMatters}
                </div>
              )}
            </motion.div>
          ) : (
            <div
              style={{
                padding: '24px 14px',
                fontSize: 12,
                color: 'var(--ds-text-subtlest, #6B778C)',
                fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
                fontStyle: 'italic',
              }}
            >
              Press ▶ to begin the story.
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Controls bar ─────────────────────────────────────────────────────────────

function ControlsBar({
  currentIndex,
  totalEvents,
  isPlaying,
  speed,
  zoom,
  phase,
  onRestart,
  onStepBack,
  onPlayPause,
  onStepForward,
  onSkipToFinalMap,
  onSpeedChange,
  onZoomChange,
  onViewCredits,
}: {
  currentIndex: number;
  totalEvents: number;
  isPlaying: boolean;
  speed: Speed;
  zoom: Zoom;
  phase: Phase;
  onRestart: () => void;
  onStepBack: () => void;
  onPlayPause: () => void;
  onStepForward: () => void;
  onSkipToFinalMap: () => void;
  onSpeedChange: (s: Speed) => void;
  onZoomChange: (z: Zoom) => void;
  onViewCredits: () => void;
}) {
  const progress = totalEvents > 0 ? currentIndex / totalEvents : 0;

  return (
    <div
      style={{
        height: 52,
        background: 'var(--ds-surface, #FFFFFF)',
        borderTop: '1px solid var(--ds-border, #DFE1E6)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 8,
        flexShrink: 0,
      }}
    >
      {/* Transport controls */}
      <CtrlBtn label="⏮" title="Restart" onClick={onRestart} />
      <CtrlBtn label="⏪" title="Step back" onClick={onStepBack} disabled={currentIndex === 0} />
      <CtrlBtn
        label={isPlaying ? '⏸' : '▶'}
        title={isPlaying ? 'Pause' : 'Play'}
        onClick={onPlayPause}
        active={isPlaying}
      />
      <CtrlBtn
        label="⏩"
        title="Step forward"
        onClick={onStepForward}
        disabled={currentIndex >= totalEvents - 1}
      />
      <CtrlBtn
        label="⏭"
        title="Skip to final map"
        onClick={onSkipToFinalMap}
        disabled={phase === 'final-map' || phase === 'credits'}
      />

      {/* Progress bar */}
      <div
        style={{
          flex: 1,
          height: 4,
          borderRadius: 2,
          background: 'var(--ds-background-neutral, #F1F2F4)',
          position: 'relative',
          cursor: 'pointer',
          margin: '0 8px',
        }}
      >
        <motion.div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            borderRadius: 2,
            background: BRAND,
            width: `${progress * 100}%`,
          }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Speed */}
      <CtrlBtn label="1×" title="Normal speed" onClick={() => onSpeedChange(1)} active={speed === 1} small />
      <CtrlBtn label="2×" title="2x speed" onClick={() => onSpeedChange(2)} active={speed === 2} small />

      {/* Zoom */}
      <CtrlBtn label="Week" title="Week zoom" onClick={() => onZoomChange('week')} active={zoom === 'week'} small />
      <CtrlBtn label="Month" title="Month zoom" onClick={() => onZoomChange('month')} active={zoom === 'month'} small />

      {/* Credits */}
      <CtrlBtn
        label="Credits"
        title="View credits"
        onClick={onViewCredits}
        active={phase === 'credits'}
        small
      />

      {/* Event counter */}
      <span
        style={{
          fontSize: 11,
          color: 'var(--ds-text-subtlest, #6B778C)',
          fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
          whiteSpace: 'nowrap',
          minWidth: 60,
          textAlign: 'right' as const,
        }}
      >
        {currentIndex} / {totalEvents}
      </span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ReplayTheatreOverlayProps {
  script: TheatreScript;
  onClose: () => void;
}

// ─── Main overlay ─────────────────────────────────────────────────────────────

export function ReplayTheatreOverlay({ script, onClose }: ReplayTheatreOverlayProps) {
  // Build events once
  const events = useMemo(() => buildTheatreEvents(script), [script]);

  // State
  const [phase, setPhase] = useState<Phase>('opening');
  const [currentEventIndex, setCurrentEventIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [zoom, setZoom] = useState<Zoom>('week');
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [revealedPersonIds, setRevealedPersonIds] = useState<Set<string>>(new Set());
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentEvent = currentEventIndex >= 0 && currentEventIndex < events.length
    ? events[currentEventIndex]
    : null;

  // ── Apply event side-effects ───────────────────────────────────────────────

  const applyEvent = useCallback((event: TheatreEvent) => {
    // Reveal character
    const charKeys = extractCharacterKeys(event);
    if (charKeys.length > 0) {
      setRevealedKeys((prev) => {
        const next = new Set(prev);
        for (const k of charKeys) next.add(k);
        return next;
      });
    }

    // Reveal people
    const personIds = extractPersonIds(event);
    if (personIds.length > 0) {
      setRevealedPersonIds((prev) => {
        const next = new Set(prev);
        for (const id of personIds) next.add(id);
        return next;
      });
    }

    // Focus
    setFocusKey(event.focusKey);

    // Phase transitions
    if (event.type === 'final_map_formed') {
      setPhase('final-map');
    } else if (event.type === 'contribution_credits') {
      setPhase('credits');
    }
  }, []);

  // ── Advance to next event ─────────────────────────────────────────────────

  const advanceToEvent = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= events.length) return;
      setCurrentEventIndex(idx);
      applyEvent(events[idx]);
    },
    [events, applyEvent],
  );

  // ── Auto-play timer ────────────────────────────────────────────────────────

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isPlaying || phase === 'opening' || phase === 'credits') return;
    if (currentEventIndex >= events.length - 1) {
      setIsPlaying(false);
      return;
    }

    const pauseMs = currentEvent?.pauseMs ?? 2000;
    timerRef.current = setTimeout(() => {
      advanceToEvent(currentEventIndex + 1);
    }, pauseMs / speed);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentEventIndex, speed, phase, currentEvent, events.length, advanceToEvent]);

  // ── Escape key ────────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [onClose]);

  // ── Transport handlers ────────────────────────────────────────────────────

  const handleStart = useCallback(() => {
    setPhase('story');
    // Reveal root character immediately
    const rootChar = script.characters.find((c) => c.key === script.rootKey);
    if (rootChar) {
      setRevealedKeys(new Set([rootChar.key]));
      if (rootChar.reporter) setRevealedPersonIds(new Set([rootChar.reporter.id]));
      setFocusKey(rootChar.key);
    }
    advanceToEvent(0);
    setIsPlaying(true);
  }, [script, advanceToEvent]);

  const handleRestart = useCallback(() => {
    setCurrentEventIndex(-1);
    setRevealedKeys(new Set());
    setRevealedPersonIds(new Set());
    setFocusKey(null);
    setPhase('opening');
    setIsPlaying(false);
  }, []);

  const handleStepBack = useCallback(() => {
    if (currentEventIndex > 0) {
      // Re-replay from beginning to index - 1
      const target = currentEventIndex - 1;
      setRevealedKeys(new Set());
      setRevealedPersonIds(new Set());
      setFocusKey(null);
      setPhase('story');
      for (let i = 0; i <= target; i++) {
        applyEvent(events[i]);
      }
      setCurrentEventIndex(target);
    }
  }, [currentEventIndex, events, applyEvent]);

  const handleStepForward = useCallback(() => {
    if (currentEventIndex < events.length - 1) {
      advanceToEvent(currentEventIndex + 1);
    }
  }, [currentEventIndex, events.length, advanceToEvent]);

  const handleSkipToFinalMap = useCallback(() => {
    // Find the final_map_formed event
    const fmIdx = events.findIndex((e) => e.type === 'final_map_formed');
    if (fmIdx === -1) return;
    // Reveal all characters and people
    setRevealedKeys(new Set(script.characters.map((c) => c.key)));
    setRevealedPersonIds(new Set(script.people.map((p) => p.id)));
    setFocusKey(null);
    setPhase('final-map');
    setCurrentEventIndex(fmIdx);
    setIsPlaying(false);
  }, [events, script.characters, script.people]);

  const handleViewCredits = useCallback(() => {
    const creditsIdx = events.findIndex((e) => e.type === 'contribution_credits');
    if (creditsIdx !== -1) {
      setRevealedKeys(new Set(script.characters.map((c) => c.key)));
      setRevealedPersonIds(new Set(script.people.map((p) => p.id)));
      setFocusKey(null);
      setPhase('credits');
      setCurrentEventIndex(creditsIdx);
      setIsPlaying(false);
    }
  }, [events, script.characters, script.people]);

  const handleCreditsReplay = useCallback(() => {
    handleRestart();
  }, [handleRestart]);

  // ── Render ────────────────────────────────────────────────────────────────

  const overlay = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        background: '#F0F2F5',
      }}
    >
      {/* ── HEADER ── */}
      <div
        style={{
          height: 56,
          background: 'var(--ds-surface, #FFFFFF)',
          borderBottom: '1px solid var(--ds-border, #DFE1E6)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 12,
          flexShrink: 0,
        }}
      >
        {/* Left: back icon + branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <span style={{ fontSize: 16, color: BRAND }}>▶</span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--ds-text, #172B4D)',
              fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
            }}
          >
            Replay Theatre
          </span>
          <span style={{ color: 'var(--ds-border, #DFE1E6)', fontSize: 16 }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <JiraIssueTypeIcon type={script.rootType} size={14} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: BRAND,
                fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
              }}
            >
              {script.rootKey}
            </span>
          </div>
          <span style={{ color: 'var(--ds-border, #DFE1E6)', fontSize: 16 }}>•</span>
          <span
            style={{
              fontSize: 12,
              color: 'var(--ds-text-subtle, #42526E)',
              fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
            }}
          >
            {script.period}
          </span>
        </div>

        {/* Right: close */}
        <button
          onClick={onClose}
          title="Close (Esc)"
          style={{
            padding: '6px 10px',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 4,
            background: 'var(--ds-surface, #FFFFFF)',
            color: 'var(--ds-text-subtle, #42526E)',
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
          }}
        >
          ✕
        </button>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {phase === 'opening' ? (
          <OpeningPhase script={script} onStart={handleStart} />
        ) : phase === 'credits' ? (
          <>
            <CharacterRail
              script={script}
              revealedKeys={revealedKeys}
              revealedPersonIds={revealedPersonIds}
              focusKey={focusKey}
              collapsed={leftCollapsed}
              onToggleCollapse={() => setLeftCollapsed((v) => !v)}
            />
            <ReplayCredits
              contributions={script.contributions}
              script={script}
              onDone={handleCreditsReplay}
            />
            <NarrationRail
              currentEvent={currentEvent}
              leftCollapsed={leftCollapsed}
              onExpandLeft={() => setLeftCollapsed(false)}
            />
          </>
        ) : (
          <>
            {/* Left: items + contributors */}
            <CharacterRail
              script={script}
              revealedKeys={revealedKeys}
              revealedPersonIds={revealedPersonIds}
              focusKey={focusKey}
              collapsed={leftCollapsed}
              onToggleCollapse={() => setLeftCollapsed((v) => !v)}
            />

            {/* Centre: timeline canvas */}
            <ReplayBranchCanvas
              script={script}
              revealedKeys={revealedKeys}
              focusKey={focusKey}
              phase={phase}
              zoom={zoom}
            />

            {/* Right: narration */}
            <NarrationRail
              currentEvent={currentEvent}
              leftCollapsed={leftCollapsed}
              onExpandLeft={() => setLeftCollapsed(false)}
            />
          </>
        )}
      </div>

      {/* ── CONTROLS ── */}
      {phase !== 'opening' && (
        <ControlsBar
          currentIndex={currentEventIndex}
          totalEvents={events.length}
          isPlaying={isPlaying}
          speed={speed}
          zoom={zoom}
          phase={phase}
          onRestart={handleRestart}
          onStepBack={handleStepBack}
          onPlayPause={() => setIsPlaying((v) => !v)}
          onStepForward={handleStepForward}
          onSkipToFinalMap={handleSkipToFinalMap}
          onSpeedChange={setSpeed}
          onZoomChange={setZoom}
          onViewCredits={handleViewCredits}
        />
      )}
    </motion.div>
  );

  return createPortal(overlay, document.body);
}
