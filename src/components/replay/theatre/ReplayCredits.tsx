import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { TheatreContribution, TheatreScript } from '@/lib/replay/theatre/theatreTypes';

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ initials, color, size = 48 }: { initials: string; color: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          color: 'white',
          fontSize: size * 0.3,
          fontWeight: 700,
          fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
          letterSpacing: '0.03em',
        }}
      >
        {initials}
      </span>
    </div>
  );
}

// ─── Contribution card ────────────────────────────────────────────────────────

function ContributionCard({ contribution }: { contribution: TheatreContribution }) {
  const { person } = contribution;

  const itemsByType: Record<string, string[]> = {};
  for (const item of [...contribution.itemsReported, ...contribution.itemsOwned]) {
    const label = `${item.key} · ${item.title.length > 40 ? item.title.slice(0, 39) + '…' : item.title}`;
    if (!itemsByType[item.type]) itemsByType[item.type] = [];
    if (!itemsByType[item.type].includes(label)) itemsByType[item.type].push(label);
  }

  const bugCount = contribution.bugsHandled.length;
  const incidentCount = contribution.incidentsHandled.length;
  const brCount = contribution.itemsReported.filter((i) => i.type === 'Business Request').length;
  const storyCount = contribution.itemsOwned.filter((i) => i.type === 'Story').length;

  return (
    <div
      style={{
        background: 'var(--ds-surface, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 8,
        padding: '20px 24px',
        marginBottom: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
        <Avatar initials={person.initials} color={person.color} size={48} />
        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--ds-text, #172B4D)',
              fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
              marginBottom: 4,
            }}
          >
            {person.name}
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--ds-text-subtle, #42526E)',
              fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
            }}
          >
            {contribution.roleInJourney}
          </div>
        </div>
      </div>

      {/* Items handled */}
      {Object.entries(itemsByType).length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--ds-text-subtlest, #6B778C)',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
              marginBottom: 6,
              fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
            }}
          >
            Handled
          </div>
          {Object.entries(itemsByType).map(([type, items]) => (
            <div key={type} style={{ marginBottom: 4 }}>
              {items.slice(0, 3).map((label) => (
                <div
                  key={label}
                  style={{
                    fontSize: 12,
                    color: 'var(--ds-text, #172B4D)',
                    fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
                    paddingLeft: 12,
                    lineHeight: '1.6',
                  }}
                >
                  · {label}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Stats row */}
      {(brCount > 0 || storyCount > 0 || bugCount > 0 || incidentCount > 0) && (
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--ds-text-subtlest, #6B778C)',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
              marginBottom: 6,
              fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
            }}
          >
            Worked on
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--ds-text, #172B4D)',
              fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
              paddingLeft: 12,
            }}
          >
            {[
              brCount > 0 && `Business Requests: ${brCount}`,
              storyCount > 0 && `Stories: ${storyCount}`,
              bugCount > 0 && `QA Bugs: ${bugCount}`,
              incidentCount > 0 && `Incidents: ${incidentCount}`,
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </div>
        </div>
      )}

      {/* Significant events */}
      {contribution.significantEvents.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--ds-text-subtlest, #6B778C)',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
              marginBottom: 6,
              fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
            }}
          >
            Lifecycle contribution
          </div>
          {contribution.significantEvents.slice(0, 3).map((ev, i) => (
            <div
              key={i}
              style={{
                fontSize: 12,
                color: 'var(--ds-text, #172B4D)',
                fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
                paddingLeft: 12,
                lineHeight: '1.6',
              }}
            >
              · {ev}
            </div>
          ))}
          {contribution.totalDaysHeld > 0 && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--ds-text-subtle, #42526E)',
                fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
                fontStyle: 'italic',
                paddingLeft: 12,
                marginTop: 4,
              }}
            >
              · {contribution.totalDaysHeld} days total involvement
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Fallback credits (when contributions array is empty) ─────────────────────

function FallbackCredits({ script }: { script: TheatreScript }) {
  return (
    <div>
      {script.people.map((person) => (
        <div
          key={person.id}
          style={{
            background: 'var(--ds-surface, #FFFFFF)',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 8,
            padding: '16px 20px',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <Avatar initials={person.initials} color={person.color} size={40} />
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--ds-text, #172B4D)',
                fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
                marginBottom: 2,
              }}
            >
              {person.name}
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--ds-text-subtle, #42526E)',
                fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
              }}
            >
              {person.roles.join(', ')}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ReplayCreditsProps {
  contributions: TheatreContribution[];
  script: TheatreScript;
  onDone: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReplayCredits({ contributions, script, onDone }: ReplayCreditsProps) {
  const hasCreditCards = contributions.length > 0;

  // Auto-call onDone after cards are shown
  useEffect(() => {
    const totalDelay = 3000 + (hasCreditCards ? contributions.length : script.people.length) * 400 + 2000;
    const t = setTimeout(onDone, totalDelay);
    return () => clearTimeout(t);
  }, [contributions.length, hasCreditCards, onDone, script.people.length]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.4,
        delayChildren: 0.6,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '32px 40px',
        background: 'var(--ds-surface-sunken, #F7F8F9)',
      }}
    >
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ marginBottom: 28 }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--ds-text, #172B4D)',
            fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
            marginBottom: 6,
          }}
        >
          The cast who carried this story
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--ds-text-subtle, #42526E)',
            fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
          }}
        >
          {script.rootTitle} · {script.period}
        </div>
      </motion.div>

      {/* Stats banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        style={{
          display: 'flex',
          gap: 24,
          marginBottom: 28,
          padding: '12px 20px',
          background: 'var(--ds-surface, #FFFFFF)',
          border: '1px solid var(--ds-border, #DFE1E6)',
          borderRadius: 8,
        }}
      >
        {[
          { label: 'Contributors', value: script.people.length },
          { label: 'Items', value: script.characters.length },
          { label: 'Days', value: script.stats.totalDays },
          { label: 'Handovers', value: script.stats.handovers },
          { label: 'Regressions', value: script.stats.regressions },
          { label: 'Boomerangs', value: script.stats.boomerangs },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: 'center' as const, minWidth: 64 }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#2E63D5',
                fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
              }}
            >
              {value}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--ds-text-subtlest, #6B778C)',
                fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Contribution cards */}
      <motion.div variants={container} initial="hidden" animate="show">
        {hasCreditCards
          ? contributions.map((c) => (
              <motion.div key={c.person.id} variants={item}>
                <ContributionCard contribution={c} />
              </motion.div>
            ))
          : script.people.map((person) => (
              <motion.div key={person.id} variants={item}>
                <FallbackCredits script={{ ...script, people: [person] }} />
              </motion.div>
            ))}
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.5 }}
        style={{ display: 'flex', gap: 12, marginTop: 24, paddingBottom: 16 }}
      >
        <button
          onClick={onDone}
          style={{
            padding: '8px 20px',
            borderRadius: 4,
            border: '1px solid var(--ds-border, #DFE1E6)',
            background: 'var(--ds-surface, #FFFFFF)',
            color: 'var(--ds-text, #172B4D)',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
          }}
        >
          ↩ Replay Again
        </button>
      </motion.div>
    </div>
  );
}
