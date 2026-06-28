/**
 * WebLinksSection — collapsible "Web Links" panel rendered below
 * Linked Work Items in every CatalystView* detail view (project hub
 * + BR both mount canonical LinkedWorkItemsSection directly).
 *
 * Visibility:
 *   - Hidden when there are no saved links AND the form is closed.
 *   - Becomes visible as soon as one link is saved OR the user clicks
 *     "+ Web Links" / "Add web link" from the `+` quick-actions menu.
 *
 * Spec recap:
 *   - Title "Web Links" with a leading "+" button
 *   - "+" click → opens the form (or focuses URL if form already open)
 *   - Form has URL + Link Text inputs and Link / Cancel buttons
 *   - Saved links render above the form when the form is open, or as
 *     the only body content when closed
 *   - The `+` dropdown's "Add web link" emits via quickActionsBus and
 *     this section listens — opening the form, expanding the section,
 *     focusing URL, and smooth-scrolling into view.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import AddIcon from '@atlaskit/icon/core/add';
import { supabase } from '@/integrations/supabase/client';
import { useWebLinks } from './useWebLinks';
import { WebLinkForm, type WebLinkFormHandle } from './WebLinkForm';
import { WebLinkRow } from './WebLinkRow';
import { useAddWebLinkListener } from '../quickActionsBus';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface WebLinksSectionProps {
  /**
   * Either a UUID (ph_issues.id / business_requests.id) OR an issue_key
   * text like "BAU-5419". The component normalises to a UUID before
   * talking to ph_web_links — see resolvedWorkItemId below. The mixed
   * input shape exists because LinkedWorkItemsSection callers pass
   * different things depending on the view.
   */
  workItemId: string | null | undefined;
}

export function WebLinksSection({ workItemId }: WebLinksSectionProps) {
  // Resolve issue_key → UUID when needed. ph_web_links.work_item_id is
  // a UUID column; the project-hub views (Story, Task, etc.) pass
  // `itemId` which is the issue_key string, so we must look up the
  // matching ph_issues.id (or business_requests.id) first. UUIDs pass
  // through verbatim.
  const { data: resolvedWorkItemId } = useQuery({
    queryKey: ['web-links-resolve-uuid', workItemId],
    enabled: !!workItemId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      if (!workItemId) return null;
      if (UUID_RE.test(workItemId)) return workItemId;
      // Try ph_issues first (most common — ticket detail views).
      const { data: phRow } = await (supabase as any)
        .from('ph_issues')
        .select('id')
        .eq('issue_key', workItemId)
        .maybeSingle();
      if (phRow?.id) return phRow.id;
      // Fallback to business_requests (BR view).
      const { data: brRow } = await (supabase as any)
        .from('business_requests')
        .select('id')
        .eq('request_key', workItemId)
        .maybeSingle();
      return brRow?.id ?? null;
    },
  });

  const { links, addLink, deleteLink, isAdding } = useWebLinks(resolvedWorkItemId);
  const [expanded, setExpanded] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const sectionRootRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<WebLinkFormHandle>(null);

  const hasLinks = links.length > 0;
  const sectionVisible = hasLinks || formOpen;

  const openForm = useCallback(() => {
    setExpanded(true);
    if (formOpen) {
      // Form already open → focus URL
      formRef.current?.focusUrl();
    } else {
      setFormOpen(true);
    }
    requestAnimationFrame(() => {
      sectionRootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [formOpen]);

  // Cross-component bridge: "+" → "Add web link" emits via quickActionsBus.
  useAddWebLinkListener(useCallback(() => { openForm(); }, [openForm]));

  // When the form's WebLinkFormHandle is mounted for the first time (form
  // just opened), the form's own useEffect auto-focuses URL. Nothing to
  // do here beyond opening the form.

  if (!sectionVisible) return null;

  return (
    <section
      ref={sectionRootRef}
      data-cv-section="web-links"
      aria-label="Web Links"
      style={{ marginBottom: 16 }}
    >
      {/* Section header — chevron + title on the left, "+" pushed to the
          right end via marginLeft:auto on the add button. */}
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
          aria-label={expanded ? 'Collapse Web Links' : 'Expand Web Links'}
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
            fontSize: 'var(--ds-font-size-500)',
            fontWeight: 653,
            lineHeight: '20px',
            color: 'var(--ds-text, #292A2E)',
            fontFamily: 'var(--cp-font-body)',
          }}
        >
          Web Links
        </h2>

        <button
          type="button"
          onClick={openForm}
          aria-label={formOpen ? 'Focus URL field' : 'Add web link'}
          title={formOpen ? 'Focus URL field' : 'Add web link'}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 24 }}>
          {links.map((link) => (
            <WebLinkRow key={link.id} link={link} onUnlink={(id) => deleteLink(id)} />
          ))}

          {formOpen && (
            <WebLinkForm
              ref={formRef}
              isSubmitting={isAdding}
              onCancel={() => setFormOpen(false)}
              onSubmit={async ({ url, link_text }) => {
                await addLink({ url, link_text });
                setFormOpen(false);
              }}
            />
          )}
        </div>
      )}
    </section>
  );
}

export default WebLinksSection;
