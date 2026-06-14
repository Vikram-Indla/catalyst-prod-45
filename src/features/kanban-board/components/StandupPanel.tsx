/**
 * StandupPanel — left rail for standup mode: countdown timer, person rotation,
 * Previous/Next. Selecting a person filters the board to them (handled by Page).
 */
import React, { useEffect, useRef, useState } from 'react';
import { token } from '@atlaskit/tokens';
import Avatar from '@atlaskit/avatar';
import { IconButton } from '@atlaskit/button/new';
import VidPlayIcon from '@atlaskit/icon/glyph/vid-play';
import VidPauseIcon from '@atlaskit/icon/glyph/vid-pause';
import { STRINGS } from '../constants';

interface Props {
  people: string[];
  avatars: Map<string, string | null>;
  index: number;
  setIndex: (i: number) => void;
  perPersonSeconds?: number;
}

function fmt(s: number) { const m = Math.floor(s / 60); const ss = s % 60; return `${m}:${ss.toString().padStart(2, '0')}`; }

export const StandupPanel: React.FC<Props> = ({ people, avatars, index, setIndex, perPersonSeconds = 120 }) => {
  const [running, setRunning] = useState(false);
  const [secs, setSecs] = useState(perPersonSeconds);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setSecs(perPersonSeconds); }, [index, perPersonSeconds]);
  useEffect(() => {
    if (running) { timer.current = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000); }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [running]);

  const roster = [...people, STRINGS.UNASSIGNED];

  return (
    <aside style={{ width: 280, minWidth: 280, flexShrink: 0, borderRight: `1px solid ${token('color.border', '#091E4224')}`, display: 'flex', flexDirection: 'column', padding: 16, gap: 12, overflowY: 'auto', background: token('elevation.surface', '#FFFFFF') }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: token('color.text', '#172B4D') }}>Standup</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: secs === 0 ? token('color.text.danger', '#AE2A19') : token('color.text', '#172B4D') }}>{fmt(secs)}</span>
        <IconButton appearance="subtle" label={running ? 'Pause' : 'Play'} icon={running ? VidPauseIcon : VidPlayIcon} onClick={() => setRunning((r) => !r)} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0}
          style={{ flex: 1, height: 32, borderRadius: 3, border: `1px solid ${token('color.border', '#091E4224')}`, background: token('elevation.surface', '#FFFFFF'), cursor: index === 0 ? 'not-allowed' : 'pointer', fontSize: 13, fontFamily: 'inherit', opacity: index === 0 ? 0.5 : 1 }}>Previous</button>
        <button onClick={() => setIndex(Math.min(roster.length - 1, index + 1))} disabled={index >= roster.length - 1}
          style={{ flex: 1, height: 32, borderRadius: 3, border: 'none', background: token('color.background.brand.bold', '#0C66E4'), color: token('color.text.inverse', '#FFFFFF'), cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'inherit', opacity: index >= roster.length - 1 ? 0.5 : 1 }}>Next</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {roster.map((name, i) => {
          const active = i === index;
          const isUnassigned = name === STRINGS.UNASSIGNED;
          return (
            <button key={name} onClick={() => setIndex(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 8px', border: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                background: active ? token('color.background.selected', '#E9F2FF') : 'transparent',
                color: active ? token('color.text.selected', '#0C66E4') : token('color.text', '#172B4D'), fontSize: 14, fontWeight: active ? 600 : 400 }}>
              <Avatar size="small" src={isUnassigned ? undefined : avatars.get(name) ?? undefined} name={name} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
