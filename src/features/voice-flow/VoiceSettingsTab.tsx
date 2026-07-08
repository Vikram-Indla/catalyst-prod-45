/**
 * VoiceSettingsTab — the visible dictation brain
 * (CAT-DICTATION-INTELLIGENCE-20260708-001 S4, Wispr dictionary/shortcuts
 * parity). Mounted as the "Voice" tab on /profile.
 *
 * Three sections:
 *  - Dictionary: terms CatyFlow has learned from the user's corrections
 *    (plus manual adds) — visible, toggleable, deletable. Feeds recognition
 *    biasing AND deterministic misheard fixes.
 *  - Snippets: say "insert <trigger>" while dictating → expansion lands.
 *  - Sound: the mic open/close ping preference.
 */
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Button, { IconButton } from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Toggle from '@atlaskit/toggle';
import Lozenge from '@atlaskit/lozenge';
import DeleteIcon from '@atlaskit/icon/core/delete';
import Spinner from '@atlaskit/spinner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { invalidateTermCache, invalidateMisheardCache } from './dictionary';
import { getVoiceSnippets, saveVoiceSnippets, invalidateSnippetCache } from './voiceSnippets';
import { useVoiceFlowSettings } from './useVoiceSettings';
import type { Snippet } from './structureText';

interface DictRow {
  id: string;
  term: string;
  misheard_as: string[] | null;
  occurrences: number | null;
  active: boolean;
  source: string | null;
}

const sectionTitle: React.CSSProperties = {
  font: 'var(--ds-font-heading-xsmall)',
  color: 'var(--ds-text)',
  marginBottom: 8,
};
const hint: React.CSSProperties = {
  font: 'var(--ds-font-body-small)',
  color: 'var(--ds-text-subtlest)',
  marginBottom: 12,
};
const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 0',
  borderBottom: '1px solid var(--ds-border)',
};

export function VoiceSettingsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { soundEnabled, setSoundEnabled } = useVoiceFlowSettings();
  const [newTerm, setNewTerm] = useState('');
  const [newTrigger, setNewTrigger] = useState('');
  const [newExpansion, setNewExpansion] = useState('');

  const dict = useQuery({
    queryKey: ['dictation-dictionary', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<DictRow[]> => {
      const { data, error } = await supabase
        .from('dictation_dictionary' as never)
        .select('id, term, misheard_as, occurrences, active, source')
        .eq('user_id' as never, user!.id as never)
        .order('occurrences', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as DictRow[];
    },
  });

  const snippets = useQuery({
    queryKey: ['voice-snippets', user?.id],
    enabled: !!user?.id,
    queryFn: () => getVoiceSnippets(),
  });

  const refreshDict = () => {
    invalidateTermCache();
    invalidateMisheardCache();
    void queryClient.invalidateQueries({ queryKey: ['dictation-dictionary', user?.id] });
  };

  const addTerm = useMutation({
    mutationFn: async (term: string) => {
      const { error } = await supabase.from('dictation_dictionary' as never).insert({
        user_id: user!.id,
        term,
        misheard_as: [],
        source: 'manual',
        occurrences: 2,
        active: true,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      setNewTerm('');
      refreshDict();
    },
  });

  const toggleTerm = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('dictation_dictionary' as never)
        .update({ active } as never)
        .eq('id' as never, id as never);
      if (error) throw error;
    },
    onSuccess: refreshDict,
  });

  const deleteTerm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dictation_dictionary' as never)
        .delete()
        .eq('id' as never, id as never);
      if (error) throw error;
    },
    onSuccess: refreshDict,
  });

  const saveSnips = useMutation({
    mutationFn: (next: Snippet[]) => saveVoiceSnippets(next),
    onSuccess: () => {
      invalidateSnippetCache();
      void queryClient.invalidateQueries({ queryKey: ['voice-snippets', user?.id] });
    },
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
      {/* ── Dictionary ── */}
      <div>
        <div style={sectionTitle}>Dictation dictionary</div>
        <div style={hint}>
          Words CatyFlow learned from your corrections, plus any you add. Active terms steer
          recognition in every language; known mishearings are auto-fixed.
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <Textfield
            placeholder="Add a name or term…"
            value={newTerm}
            onChange={(e) => setNewTerm((e.target as HTMLInputElement).value)}
            isCompact
          />
          <Button
            appearance="primary"
            isDisabled={!newTerm.trim() || addTerm.isPending}
            onClick={() => addTerm.mutate(newTerm.trim())}
          >
            Add
          </Button>
        </div>
        {dict.isPending ? (
          <Spinner size="small" />
        ) : dict.isError ? (
          <div style={{ ...hint, color: 'var(--ds-text-danger)' }}>Could not load dictionary.</div>
        ) : (dict.data ?? []).length === 0 ? (
          <div style={hint}>Nothing yet — correct a dictated word once and it shows up here.</div>
        ) : (
          (dict.data ?? []).map((row) => (
            <div key={row.id} style={rowStyle}>
              <span style={{ flex: 1, font: 'var(--ds-font-body)', color: 'var(--ds-text)' }}>
                <bdi>{row.term}</bdi>
                {row.misheard_as && row.misheard_as.length > 0 && (
                  <span style={{ font: 'var(--ds-font-body-small)', color: 'var(--ds-text-subtlest)', marginInlineStart: 8 }}>
                    fixes: {row.misheard_as.join(', ')}
                  </span>
                )}
              </span>
              {row.source === 'learned' && <Lozenge>learned</Lozenge>}
              <Toggle
                isChecked={row.active}
                onChange={() => toggleTerm.mutate({ id: row.id, active: !row.active })}
                label={`${row.term} active`}
              />
              <IconButton
                icon={DeleteIcon}
                label={`Delete ${row.term}`}
                appearance="subtle"
                spacing="compact"
                onClick={() => deleteTerm.mutate(row.id)}
              />
            </div>
          ))
        )}
      </div>

      {/* ── Snippets + sound ── */}
      <div>
        <div style={sectionTitle}>Voice snippets</div>
        <div style={hint}>
          Say “insert <em>trigger</em>” while dictating and the expansion lands instead.
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <Textfield
            placeholder="Trigger (e.g. signoff)"
            value={newTrigger}
            onChange={(e) => setNewTrigger((e.target as HTMLInputElement).value)}
            isCompact
          />
          <Textfield
            placeholder="Expansion text"
            value={newExpansion}
            onChange={(e) => setNewExpansion((e.target as HTMLInputElement).value)}
            isCompact
          />
          <Button
            appearance="primary"
            isDisabled={!newTrigger.trim() || !newExpansion.trim() || saveSnips.isPending}
            onClick={() => {
              const next = [...(snippets.data ?? []), { trigger: newTrigger.trim(), expansion: newExpansion }];
              saveSnips.mutate(next);
              setNewTrigger('');
              setNewExpansion('');
            }}
          >
            Add
          </Button>
        </div>
        {(snippets.data ?? []).map((s, i) => (
          <div key={`${s.trigger}-${i}`} style={rowStyle}>
            <span style={{ font: 'var(--ds-font-body)', color: 'var(--ds-text)' }}>{s.trigger}</span>
            <span
              style={{
                flex: 1,
                font: 'var(--ds-font-body-small)',
                color: 'var(--ds-text-subtlest)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <bdi>{s.expansion}</bdi>
            </span>
            <IconButton
              icon={DeleteIcon}
              label={`Delete snippet ${s.trigger}`}
              appearance="subtle"
              spacing="compact"
              onClick={() => saveSnips.mutate((snippets.data ?? []).filter((_, j) => j !== i))}
            />
          </div>
        ))}

        <div style={{ ...sectionTitle, marginTop: 24 }}>Sound</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Toggle
            isChecked={soundEnabled}
            onChange={() => setSoundEnabled(!soundEnabled)}
            label="Mic open/close sound"
          />
          <span style={{ font: 'var(--ds-font-body)', color: 'var(--ds-text-subtle)' }}>
            Play a subtle ping when the mic opens and closes
          </span>
        </div>
      </div>
    </div>
  );
}

export default VoiceSettingsTab;
