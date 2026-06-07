/**
 * DesignsSection — collapsible "Designs" panel rendered above Linked
 * Work Items (and so directly below Child Work Items) in every
 * CatalystView*.
 *
 * Visibility:
 *   - Hidden when there are no saved designs AND the form is closed.
 *   - Becomes visible when a design is saved OR the user clicks the
 *     "+" on the title OR the `+` quick-actions menu's "Add design".
 *
 * Spec mirror of WebLinksSection: chevron + title on the left, "+"
 * pushed to the right end; form auto-focuses the URL field and
 * smooth-scrolls into view via the form's own useEffect.
 */
import React, { useCallback, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import AddIcon from '@atlaskit/icon/core/add';
import { supabase } from '@/integrations/supabase/client';
import { useDesigns } from './useDesigns';
import { DesignForm, type DesignFormHandle } from './DesignForm';
import { DesignRow } from './DesignRow';
import { useAddDesignListener } from '../quickActionsBus';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface DesignsSectionProps {
  /** Either a UUID or an issue_key / request_key (resolved internally). */
  workItemId: string | null | undefined;
}

export function DesignsSection({ workItemId }: DesignsSectionProps) {
  // Same UUID-or-key resolver pattern as WebLinksSection — accepts both
  // and normalises to a ph_issues.id / business_requests.id UUID.
  const { data: resolvedWorkItemId } = useQuery({
    queryKey: ['designs-resolve-uuid', workItemId],
    enabled: !!workItemId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      if (!workItemId) return null;
      if (UUID_RE.test(workItemId)) return workItemId;
      const { data: phRow } = await (supabase as any)
        .from('ph_issues')
        .select('id')
        .eq('issue_key', workItemId)
        .maybeSingle();
      if (phRow?.id) return phRow.id;
      const { data: brRow } = await (supabase as any)
        .from('business_requests')
        .select('id')
        .eq('request_key', workItemId)
        .maybeSingle();
      return brRow?.id ?? null;
    },
  });

  const { designs, addDesign, deleteDesign, isAdding } = useDesigns(resolvedWorkItemId);
  const [expanded, setExpanded] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const sectionRootRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<DesignFormHandle>(null);

  const hasDesigns = designs.length > 0;
  const sectionVisible = hasDesigns || formOpen;

  const openForm = useCallback(() => {
    setExpanded(true);
    if (formOpen) {
      formRef.current?.focusUrl();
    } else {
      setFormOpen(true);
    }
    requestAnimationFrame(() => {
      sectionRootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [formOpen]);

  useAddDesignListener(useCallback(() => { openForm(); }, [openForm]));

  if (!sectionVisible) return null;

  return (
    <section
      ref={sectionRootRef}
      data-cv-section="designs"
      aria-label="Designs"
      style={{ marginBottom: 16 }}
    >
      {/* Header — chevron + title left, + button at right end. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 0',
        }}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Collapse Designs' : 'Expand Designs'}
          aria-expanded={expanded}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: 0,
            borderRadius: 3,
            color: 'var(--ds-text-subtle, #505258)',
          }}
        >
          {expanded
            ? <ChevronDownIcon size="small" label="" primaryColor="var(--ds-icon-subtle, #505258)" />
            : <ChevronRightIcon size="small" label="" primaryColor="var(--ds-icon-subtle, #505258)" />
          }
        </button>

        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 653,
            lineHeight: '20px',
            color: 'var(--ds-text, #292A2E)',
            fontFamily: 'var(--cp-font-body)',
          }}
        >
          Designs
        </h2>

        <button
          type="button"
          onClick={openForm}
          aria-label={formOpen ? 'Focus Figma URL field' : 'Add design'}
          title={formOpen ? 'Focus Figma URL field' : 'Add design'}
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: 0,
            borderRadius: 3,
            color: 'var(--ds-text-subtle, #505258)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <AddIcon label="" color="var(--ds-text-subtle, #505258)" />
        </button>
      </div>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 24 }}>
          {designs.map((d) => (
            <DesignRow key={d.id} design={d} onUnlink={(id) => deleteDesign(id)} />
          ))}

          {formOpen && (
            <DesignForm
              ref={formRef}
              isSubmitting={isAdding}
              onCancel={() => setFormOpen(false)}
              onSubmit={async (url) => {
                await addDesign(url);
                setFormOpen(false);
              }}
            />
          )}
        </div>
      )}
    </section>
  );
}

export default DesignsSection;
