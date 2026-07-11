/**
 * CreateIdeaModal / CreateIdeaForm — CAT-IDEATION-REBUILD-20260709-001 Phase 2 S2.
 *
 * Design 04 §C.3 (single screen, no steps) + Mobbin 05 §C row 3 (Linear New
 * Issue ×3, image-verified): title-first, Save-as-draft, "Create another"
 * (K-delta 2). Fields exactly: title*, problem* (ADF), value (optional,
 * collapsed), class*, product (optional). Scoring/strategy are downstream
 * roles' work — nothing else renders here.
 *
 * 100% canonical chrome, zero hand-rolled UI:
 *   Modal shell        PortalFix (@atlaskit/modal-dialog drop-in — atlaskit
 *                      portal renders empty in this Vite build)
 *   Field wrappers     @atlaskit/form  Field / ErrorMessage / HelperMessage
 *   Title              @atlaskit/textfield (1–300, DB CHECK mirror)
 *   Problem / Value    RichTextEditor headless + tiptapToAdf (ADF jsonb)
 *   Class / Product    @atlaskit/select (text labels — first-time submitters,
 *                      not Linear's icon-dense chips; 05 row 3 note)
 *   Create another     @atlaskit/checkbox (D15; @atlaskit/toggle not installed)
 *   Buttons            @atlaskit/button/new
 *
 * Success feedback: flag.success is a platform-wide no-op (suppressed
 * 2026-06-16, flags.tsx) — call kept for reversibility per the
 * CreateBusinessRequestModal exemplar; the real confirmation is navigation to
 * the created idea (or the inline "created" line in Create-another mode).
 *
 * NON-scope (Plan Lock): voice, attachments, AI enrichment (static note only).
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import {
  ModalDialog,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@/components/workhub/create-story/PortalFix';
import { Field, ErrorMessage, HelperMessage } from '@atlaskit/form';
import Select from '@atlaskit/select';
import Textfield from '@atlaskit/textfield';
import { Checkbox } from '@atlaskit/checkbox';
import Button, { IconButton } from '@atlaskit/button/new';
import { Box, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import CrossIcon from '@atlaskit/icon/glyph/cross';

import { supabase, typedQuery } from '@/integrations/supabase/client';
import { flag } from '@/components/shared/JiraTable/flags';
import { Routes } from '@/lib/routes';
import { Lightbulb } from '@/lib/atlaskit-icons';
import { ProductAvatar } from '@/components/icons/ProductAvatar';
import { RichTextEditor } from '@/components/catalyst-detail-views/shared/sections/Description/RichTextEditor';
import { tiptapToAdf } from '@/components/catalyst-detail-views/shared/sections/Description/utils/tiptapToAdf';
import { useCreateIdea } from '@/hooks/useCreateIdea';
import type { CreateIdeaInput, IdeaClass } from '@/modules/ideation/types';

// ─────────────────────────────────────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────────────────────────────────────

interface IconOption {
  value: string;
  label: string;
  icon?: ReactNode;
  sublabel?: string;
}

/** idn_idea_class enum (S1) — text labels per Mobbin 05 row 3 note. */
const CLASS_OPTIONS: Array<{ value: IdeaClass; label: string }> = [
  { value: 'problem', label: 'Problem' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'improvement', label: 'Improvement' },
];

/** Products — same canonical query as CreateBusinessRequestModal's
 *  useProductOptions (mirrors BrMoveProductDialog). Optional container. */
function useProductOptions() {
  return useQuery({
    queryKey: ['ideation-create-products'],
    queryFn: async (): Promise<IconOption[]> => {
      const { data, error } = await (supabase as any)
        .from('products')
        .select('id, name, code, icon_key')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []).map((p: { id: string; name: string; code: string; icon_key?: string | null }) => ({
        value: p.id,
        label: p.name,
        sublabel: p.code,
        icon: <ProductAvatar code={p.code} iconKey={p.icon_key ?? null} size={16} />,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

const formatIconOption = (option: IconOption) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: token('space.100') }}>
    {option.icon}
    <span>{option.label}</span>
    {option.sublabel && (
      <span style={{ color: token('color.text.subtlest'), font: token('font.body.small') }}>
        {option.sublabel}
      </span>
    )}
  </span>
);

// ─────────────────────────────────────────────────────────────────────────────
// ADF helpers
// ─────────────────────────────────────────────────────────────────────────────

/** True when an ADF doc contains any non-whitespace text — validation for the
 *  required problem field. Recursive; zero-assumption (unknown shape = empty). */
function adfHasText(adf: unknown): boolean {
  if (!adf || typeof adf !== 'object') return false;
  const node = adf as { text?: string; content?: unknown[] };
  if (typeof node.text === 'string' && node.text.trim().length > 0) return true;
  return Array.isArray(node.content) && node.content.some(adfHasText);
}

// ─────────────────────────────────────────────────────────────────────────────
// xcss token styles (zero inline colour props)
// ─────────────────────────────────────────────────────────────────────────────

const headerWrapperStyles = xcss({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 'space.200' });
// ads-scanner:ignore-next-line — xcss space.* token name, numeric suffix misread as raw px (gate noise, CLAUDE.md ADS-tokens §escape hatch)
const requiredHelperStyles = xcss({ font: 'font.body.small', color: 'color.text.subtlest', marginBottom: 'space.300' });
const fieldGroupStyles = xcss({ display: 'flex', flexDirection: 'column', gap: 'space.200' });
// ads-scanner:ignore-next-line — xcss space.* token name, numeric suffix misread as raw px (gate noise, CLAUDE.md ADS-tokens §escape hatch)
const errorBannerStyles = xcss({ padding: 'space.150', borderRadius: 'border.radius', backgroundColor: 'color.background.danger', color: 'color.text.danger', font: 'font.body.small' });
const aiNoteStyles = xcss({ font: 'font.body.small', color: 'color.text.subtlest', marginBlockStart: 'space.200' });
const createdNoteStyles = xcss({ font: 'font.body.small', color: 'color.text.subtle' });
const footerLeftStyles = xcss({ flex: '1', display: 'flex', alignItems: 'center', gap: 'space.200' });
const footerRightStyles = xcss({ display: 'flex', alignItems: 'center', gap: 'space.100' });
const pageFooterStyles = xcss({ display: 'flex', alignItems: 'center', gap: 'space.100', paddingBlockStart: 'space.300' });

// ─────────────────────────────────────────────────────────────────────────────
// Form state
// ─────────────────────────────────────────────────────────────────────────────

const TITLE_MAX = 300; // DB CHECK: char_length(title) BETWEEN 1 AND 300

interface FormState {
  title: string;
  problemAdf: unknown;
  valueAdf: unknown;
  ideaClass: IdeaClass | '';
  productId: string;
}

const INITIAL: FormState = { title: '', problemAdf: null, valueAdf: null, ideaClass: '', productId: '' };

export interface CreateIdeaFormProps {
  layout: 'modal' | 'page';
  /** Modal host's close — omitted for the full-page variant. */
  onClose?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// CreateIdeaForm — shared body (modal + /ideation/submit full page)
// ─────────────────────────────────────────────────────────────────────────────

export function CreateIdeaForm({ layout, onClose }: CreateIdeaFormProps) {
  const navigate = useNavigate();
  const createIdea = useCreateIdea();
  const { data: productOptions = [], isLoading: productsLoading } = useProductOptions();

  const [form, setForm] = useState<FormState>(INITIAL);
  /** Remount key for the uncontrolled ADF editors on Create-another reset. */
  const [formEpoch, setFormEpoch] = useState(0);
  const [showValue, setShowValue] = useState(false);
  const [createMore, setCreateMore] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<{ key: string; status: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<'draft' | 'submit' | null>(null);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError(null);
  }, []);

  const titleError = submitAttempted && (!form.title.trim() || form.title.trim().length > TITLE_MAX)
    ? (form.title.trim() ? `Keep the title under ${TITLE_MAX} characters` : 'Give the idea a title')
    : undefined;
  const problemError = submitAttempted && !adfHasText(form.problemAdf)
    ? 'Describe the problem or opportunity'
    : undefined;
  const classError = submitAttempted && !form.ideaClass ? 'Pick a class' : undefined;

  const isValid = useMemo(
    () =>
      form.title.trim().length > 0 &&
      form.title.trim().length <= TITLE_MAX &&
      adfHasText(form.problemAdf) &&
      !!form.ideaClass,
    [form]
  );

  const resetForm = useCallback(() => {
    setForm(INITIAL);
    setFormEpoch((e) => e + 1);
    setShowValue(false);
    setSubmitAttempted(false);
    setFormError(null);
  }, []);

  const handleAction = useCallback(
    async (submit: boolean) => {
      setSubmitAttempted(true);
      setFormError(null);
      if (!isValid) return;
      setPendingAction(submit ? 'submit' : 'draft');
      try {
        const input: CreateIdeaInput = {
          title: form.title.trim(),
          idea_class: form.ideaClass as IdeaClass,
          problem_statement: adfHasText(form.problemAdf) ? form.problemAdf : undefined,
          proposed_value: adfHasText(form.valueAdf) ? form.valueAdf : undefined,
          product_id: form.productId || null,
        };
        const created = await createIdea.mutateAsync({ input, submit });
        // Suppressed platform-wide — kept for reversibility (exemplar parity).
        flag.success(`${created.idea_key} ${submit ? 'submitted' : 'saved as draft'}`, `"${input.title.slice(0, 60)}"`);
        if (createMore) {
          setLastCreated({ key: created.idea_key, status: submit ? 'submitted' : 'saved as draft' });
          resetForm();
        } else {
          resetForm();
          onClose?.();
          navigate(Routes.ideation.idea(created.slug));
        }
      } catch (err: unknown) {
        setFormError(err instanceof Error ? err.message : 'Failed to create the idea');
      } finally {
        setPendingAction(null);
      }
    },
    [form, isValid, createMore, createIdea, navigate, onClose, resetForm]
  );

  const isSubmitting = createIdea.isPending;

  const fields = (
    <>
      <Box xcss={requiredHelperStyles}>
        Required fields are marked with an asterisk{' '}
        <span aria-hidden="true" style={{ color: token('color.text.danger') }}>*</span>
      </Box>

      {formError && <Box xcss={errorBannerStyles}>{formError}</Box>}

      <Box xcss={fieldGroupStyles}>
        {/* ── Title — first, per Linear evidence (05 row 3) ── */}
        <Field name="title" label="Title" isRequired>
          {({ fieldProps }) => (
            <>
              <Textfield
                {...(fieldProps as any)}
                value={form.title}
                onChange={(e) => set('title', (e.target as HTMLInputElement).value)}
                maxLength={TITLE_MAX}
                placeholder="One line that names the idea"
                isInvalid={!!titleError}
                autoFocus
                testId="idea-title"
              />
              {titleError && <ErrorMessage>{titleError}</ErrorMessage>}
            </>
          )}
        </Field>

        {/* ── Problem — required ADF (design C.3: problem-first capture) ── */}
        <Field name="problem" label="What problem or opportunity?" isRequired>
          {() => (
            <>
              <RichTextEditor
                key={`problem-${formEpoch}`}
                initialAdf={null}
                hideActionButtons
                minHeight={120}
                placeholder="What hurts today, or what could be better?"
                onSave={() => {}}
                onCancel={() => {}}
                onChange={(tiptapJson) => {
                  try {
                    set('problemAdf', tiptapToAdf(tiptapJson));
                  } catch {
                    /* noop — invalid interim states are fine */
                  }
                }}
              />
              {problemError && <ErrorMessage>{problemError}</ErrorMessage>}
            </>
          )}
        </Field>

        {/* ── Proposed value — optional, collapsed (C.3) ── */}
        {showValue ? (
          <Field name="proposed_value" label="Proposed value">
            {() => (
              <RichTextEditor
                key={`value-${formEpoch}`}
                initialAdf={null}
                hideActionButtons
                minHeight={100}
                placeholder="What improves if this ships?"
                onSave={() => {}}
                onCancel={() => {}}
                onChange={(tiptapJson) => {
                  try {
                    set('valueAdf', tiptapToAdf(tiptapJson));
                  } catch {
                    /* noop */
                  }
                }}
              />
            )}
          </Field>
        ) : (
          <div>
            <Button appearance="subtle" onClick={() => setShowValue(true)} testId="idea-add-value">
              + Add proposed value
            </Button>
          </div>
        )}

        {/* ── Class — @atlaskit/select, text labels ── */}
        <Field name="idea_class" label="Class" isRequired>
          {({ fieldProps }) => (
            <>
              <Select
                {...(fieldProps as any)}
                inputId="idea-class"
                options={CLASS_OPTIONS}
                value={CLASS_OPTIONS.find((o) => o.value === form.ideaClass) ?? null}
                onChange={(opt: any) => set('ideaClass', opt?.value ?? '')}
                placeholder="Problem · Opportunity · Improvement"
                isSearchable={false}
              />
              {classError && <ErrorMessage>{classError}</ErrorMessage>}
            </>
          )}
        </Field>

        {/* ── Product — optional container; affinity is decided at conversion ── */}
        <Field name="product_id" label="Product">
          {({ fieldProps }) => (
            <>
              <Select<IconOption>
                {...(fieldProps as any)}
                inputId="idea-product"
                options={productOptions}
                value={productOptions.find((o) => o.value === form.productId) ?? null}
                onChange={(opt: any) => set('productId', opt?.value ?? '')}
                isLoading={productsLoading}
                formatOptionLabel={formatIconOption}
                placeholder="Select product (optional)"
                isSearchable
                isClearable
              />
              <HelperMessage>Optional — product fit is confirmed during review.</HelperMessage>
            </>
          )}
        </Field>
      </Box>

      {/* ── Post-submit AI note — static copy only, enrichment is Phase 4 ── */}
      <Box xcss={aiNoteStyles}>✦ After you submit, Caty will check for similar ideas.</Box>
    </>
  );

  const footerButtons = (
    <>
      <Box xcss={footerLeftStyles}>
        <Checkbox
          isChecked={createMore}
          onChange={(e) => setCreateMore(e.currentTarget.checked)}
          label="Create another"
          testId="idea-create-more"
        />
        {lastCreated && (
          <Box xcss={createdNoteStyles} testId="idea-last-created">
            {lastCreated.key} {lastCreated.status}
          </Box>
        )}
      </Box>
      <Box xcss={footerRightStyles}>
        {layout === 'modal' && (
          <Button appearance="subtle" onClick={onClose} isDisabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button
          onClick={() => handleAction(false)}
          isLoading={isSubmitting && pendingAction === 'draft'}
          isDisabled={isSubmitting && pendingAction !== 'draft'}
          testId="idea-save-draft"
        >
          Save draft
        </Button>
        <Button
          appearance="primary"
          onClick={() => handleAction(true)}
          isLoading={isSubmitting && pendingAction === 'submit'}
          isDisabled={isSubmitting && pendingAction !== 'submit'}
          testId="idea-submit"
        >
          Submit idea
        </Button>
      </Box>
    </>
  );

  if (layout === 'modal') {
    return (
      <>
        <ModalBody>{fields}</ModalBody>
        <ModalFooter>{footerButtons}</ModalFooter>
      </>
    );
  }

  return (
    <div style={{ maxWidth: 720 }}>
      {fields}
      <Box xcss={pageFooterStyles}>{footerButtons}</Box>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CreateIdeaModal — PortalFix host (?create=idea + in-page entries)
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateIdeaModal({ isOpen, onClose }: CreateIdeaModalProps) {
  return (
    <ModalTransition>
      {isOpen && (
        <ModalDialog onClose={onClose} width="large" modalTitle="New idea">
          <ModalHeader>
            <Box xcss={headerWrapperStyles}>
              <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100') }}>
                <Lightbulb size={16} />
                <ModalTitle>New idea</ModalTitle>
              </div>
              <IconButton
                appearance="subtle"
                spacing="default"
                label="Close"
                icon={(p) => <CrossIcon {...p} label="" />}
                onClick={onClose}
              />
            </Box>
          </ModalHeader>
          <CreateIdeaForm layout="modal" onClose={onClose} />
        </ModalDialog>
      )}
    </ModalTransition>
  );
}
