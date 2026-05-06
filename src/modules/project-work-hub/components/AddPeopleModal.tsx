/**
 * AddPeopleModal — extracted from BacklogPage so toggling open does NOT
 * re-render the 5K-line backlog tree. Subscribes to useAddPeopleModalStore
 * directly; mounted once at the page root.
 */
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button';
import CloseIcon from '@atlaskit/icon/glyph/cross';
import { ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { flag } from '@/components/shared/JiraTable';
import { useAddPeopleModalStore } from '@/stores/addPeopleModalStore';

export function AddPeopleModal() {
  const { isOpen, projectId, projectName, close } = useAddPeopleModalStore();
  const queryClient = useQueryClient();
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<'Admin' | 'Member' | 'Viewer'>('Member');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const reset = () => {
    setEmails('');
    setRole('Member');
  };
  const handleClose = () => {
    if (submitting) return;
    close();
    reset();
  };

  const handleSubmit = async () => {
    const tokens = emails.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    if (!tokens.length || !projectId) return;
    setSubmitting(true);
    try {
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('email', tokens);
      if (pErr) throw pErr;
      const found = profiles ?? [];
      if (!found.length) {
        flag.error('No matching users', `Could not find profiles for: ${tokens.join(', ')}`);
        setSubmitting(false);
        return;
      }
      const rows = found.map((p: any) => ({
        project_id: projectId,
        user_id: p.id,
        role: role.toLowerCase(),
      }));
      const { error: insErr } = await supabase
        .from('project_members')
        .upsert(rows as any, { onConflict: 'project_id,user_id' });
      if (insErr) throw insErr;
      flag.success(
        `Added ${found.length} ${found.length === 1 ? 'person' : 'people'}`,
        found.map((p: any) => p.full_name || p.email).join(', '),
      );
      queryClient.invalidateQueries({ queryKey: ['chrome-band-members', projectId] });
      close();
      reset();
    } catch (e: any) {
      flag.error('Failed to add people', String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return ReactDOM.createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-people-modal-title"
      data-testid="add-people-modal"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(9, 30, 66, 0.54)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 60,
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') handleClose();
      }}
    >
      <div
        style={{
          width: 480,
          maxWidth: 'calc(100vw - 48px)',
          background: token('elevation.surface', '#FFFFFF'),
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(9, 30, 66, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 120px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 12px' }}>
          <h2
            id="add-people-modal-title"
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 653,
              letterSpacing: '-0.003em',
              color: token('color.text', '#292A2E'),
            }}
          >
            Add people to {projectName}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={handleClose}
            style={{
              width: 32,
              height: 32,
              border: 'none',
              background: 'transparent',
              color: token('color.text.subtle', '#6B6E76'),
              cursor: 'pointer',
              borderRadius: 3,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CloseIcon size="small" label="Close" />
          </button>
        </div>

        <div style={{ padding: '0 24px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label
              htmlFor="add-people-emails"
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: token('color.text.subtle', '#6B6E76'),
                marginBottom: 4,
              }}
            >
              Names or emails <span style={{ color: token('color.text.danger', '#AE2A19') }}>*</span>
            </label>
            <Textfield
              id="add-people-emails"
              placeholder="e.g., maria@company.com, john@company.com"
              value={emails}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmails(e.target.value)}
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: token('color.text.subtle', '#6B6E76'),
                marginBottom: 4,
              }}
            >
              Role <span style={{ color: token('color.text.danger', '#AE2A19') }}>*</span>
            </label>
            <button
              type="button"
              data-testid="add-people-modal.role-trigger"
              onClick={() => setRole((r) => (r === 'Member' ? 'Admin' : r === 'Admin' ? 'Viewer' : 'Member'))}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                height: 36,
                padding: '0 12px',
                border: `1px solid ${token('color.border', '#DFE1E6')}`,
                borderRadius: 3,
                background: token('elevation.surface', '#FFFFFF'),
                color: token('color.text', '#292A2E'),
                fontSize: 14,
                fontWeight: 400,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              <span>{role}</span>
              <ChevronDown size={14} />
            </button>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: token('color.text.subtlest', '#6B778C') }}>
            Each person you add will get access to this project.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '12px 24px 20px',
            borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
          }}
        >
          <Button appearance="subtle" onClick={handleClose} isDisabled={submitting}>
            Cancel
          </Button>
          <Button
            appearance="primary"
            isDisabled={!emails.trim() || submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Adding…' : 'Add'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
