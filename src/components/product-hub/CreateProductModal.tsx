/**
 * CreateProductModal — Phase 4 (2026-05-02).
 *
 * Mirrors Project Hub's CreateProjectModal in spirit (open/close lifecycle,
 * navigate-on-success), but lighter: one form, direct INSERT into
 * public.products (no RPC layer needed yet — products schema is simple).
 *
 * Trigger: AllProductsPage's "+ Create Product" button.
 *
 * Fields:
 *   - Name (required) — free text. Used for display.
 *   - Code (required) — short uppercase identifier (3-6 chars). Used in URLs:
 *     /product-hub/{CODE}/backlog. Auto-generated from name on first edit but
 *     user-overridable. Must be unique (DB enforces; we surface clean error).
 *   - Description (optional) — multi-line.
 *   - Color (optional) — accent for the product card / sidebar avatar.
 *
 * On submit:
 *   - INSERT into public.products
 *   - Invalidate the products list query so AllProductsPage refetches
 *   - Navigate to /product-hub/{NEW_CODE}/dashboard so the user lands inside
 *     the new product's per-product shell immediately.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { token } from '@atlaskit/tokens';
import { RichTextEditor } from '@/components/catalyst-detail-views/shared/sections/Description/RichTextEditor';
import { tiptapToAdf } from '@/components/catalyst-detail-views/shared/sections/Description/utils/tiptapToAdf';
import type { AdfDoc } from '@/components/catalyst-detail-views/shared/sections/Description/utils/adfToTiptap';
import { isAdfEmpty } from '@/components/shared/rich-text/atlaskit/adfHelpers';
import { IconPickerGrid, PRODUCT_ICONS } from '@/components/shared/IconPickerGrid';

interface CreateProductModalProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_ICON_KEY = PRODUCT_ICONS[0]?.key ?? '';

/**
 * Generate a sensible default code from a free-text name.
 * "Investor Journey" → "INV"
 * "Mini Apps" → "MINI"
 * "Customer 360" → "CUST"
 */
function deriveCodeFromName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  if (!cleaned) return '';
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 4).toUpperCase();
  }
  // Multi-word: first 3-4 letters of the first word
  return parts[0].slice(0, 4).toUpperCase();
}

export function CreateProductModal({ open, onClose }: CreateProductModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [descriptionAdf, setDescriptionAdf] = useState<AdfDoc | null>(null);
  const [iconKey, setIconKey] = useState(DEFAULT_ICON_KEY);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setName('');
      setCode('');
      setCodeManuallyEdited(false);
      setDescriptionAdf(null);
      setIconKey(DEFAULT_ICON_KEY);
      setSubmitting(false);
      setErrorMsg(null);
    }
  }, [open]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose, submitting]);

  // Auto-derive code from name until user manually edits the code field
  const handleNameChange = (val: string) => {
    setName(val);
    if (!codeManuallyEdited) setCode(deriveCodeFromName(val));
  };

  const handleCodeChange = (val: string) => {
    // Always uppercase and limit to alphanumeric, 1-20 chars
    const clean = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 20);
    setCode(clean);
    setCodeManuallyEdited(true);
  };

  const isValid =
    name.trim().length > 0 &&
    code.trim().length >= 2 &&
    code.trim().length <= 20;

  const handleSubmit = useCallback(async () => {
    if (!isValid) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const descriptionPayload =
        descriptionAdf && !isAdfEmpty(descriptionAdf)
          ? JSON.stringify(descriptionAdf)
          : null;

      const { data, error } = await (supabase as any)
        .from('products')
        .insert({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: descriptionPayload,
          icon_key: iconKey,
          is_active: true,
        })
        .select('id, code, name')
        .single();

      if (error) {
        // 23505 = unique_violation (the code already exists)
        if (error.code === '23505') {
          setErrorMsg(`A product with code "${code.trim().toUpperCase()}" already exists.`);
        } else {
          setErrorMsg(error.message);
        }
        setSubmitting(false);
        return;
      }

      catalystToast.success(`Product line "${data.name}" created`);
      queryClient.invalidateQueries({ queryKey: ['product-hub', 'products'] });
      onClose();
      navigate(`/product-hub/${data.code}/dashboard`);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to create product line');
      setSubmitting(false);
    }
  }, [name, code, descriptionAdf, iconKey, isValid, navigate, onClose, queryClient]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-product-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--ds-shadow-raised, rgba(9, 30, 66, 0.54))',
        fontFamily: 'var(--cp-font-body)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        style={{
          width: 480,
          maxWidth: '90vw',
          background: token('elevation.surface'),
          color: token('color.text'),
          borderRadius: 8,
          boxShadow: token('elevation.shadow.overlay'),
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 24px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2
            id="create-product-title"
            style={{ fontSize: 'var(--ds-font-size-600)', fontWeight: 600, margin: 0, color: token('color.text') }}
          >
            Create product line
          </h2>
          <button
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            style={{ background: 'transparent', border: 'none', cursor: submitting ? 'default' : 'pointer', padding: 4, color: token('color.text.subtle') }}
          >
            <CrossIcon label="Close" size="small" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '8px 24px 16px', overflowY: 'auto', flex: 1 }}>
          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="product-name" style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, marginBottom: 4, color: token('color.text') }}>
              Name <span style={{ color: token('color.text.danger') }}>*</span>
            </label>
            <input
              id="product-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Investor Journey"
              disabled={submitting}
              autoFocus
              style={inputStyle}
            />
          </div>

          {/* Code */}
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="product-code" style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, marginBottom: 4, color: token('color.text') }}>
              Code <span style={{ color: token('color.text.danger') }}>*</span>
            </label>
            <input
              id="product-code"
              type="text"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="e.g. INV"
              disabled={submitting}
              maxLength={20}
              style={{ ...inputStyle, fontFamily: 'var(--cp-font-mono)', textTransform: 'uppercase' }}
            />
            <p style={{ fontSize: 'var(--ds-font-size-100)', color: token('color.text.subtle'), margin: '4px 0 0' }}>
              Used in URLs: /product-hub/{code || 'CODE'}/backlog
            </p>
          </div>

          {/* Description — canonical RichTextEditor in headless mode
              (modal footer owns Create / Cancel). Mirrors the BR create
              modal pattern: onChange captures TiptapDoc → tiptapToAdf →
              local state; on submit we JSON.stringify(adf) and write
              that to products.description. */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, marginBottom: 4, color: token('color.text') }}>
              Description <span style={{ fontWeight: 400, color: token('color.text.subtle') }}>(optional)</span>
            </label>
            <div
              style={{
                border: `1px solid ${token('color.border.input')}`,
                borderRadius: 4,
                background: token('color.background.input'),
                overflow: 'hidden',
              }}
            >
              <RichTextEditor
                initialAdf={null}
                hideActionButtons
                placeholder="What this product line covers"
                minHeight={100}
                onSave={() => {}}
                onCancel={() => {}}
                onChange={(tiptapJson) => {
                  try {
                    setDescriptionAdf(tiptapToAdf(tiptapJson));
                  } catch {
                    /* noop — keep last good ADF */
                  }
                }}
              />
            </div>
          </div>

          {/* Icon */}
          <div style={{ marginBottom: 4 }}>
            <label style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, marginBottom: 4, color: token('color.text') }}>
              Icon
            </label>
            <IconPickerGrid
              icons={PRODUCT_ICONS}
              value={iconKey}
              onChange={setIconKey}
              testIdPrefix="product-icon"
            />
          </div>

          {errorMsg && (
            <div
              role="alert"
              style={{
                marginTop: 16,
                padding: '8px 12px',
                background: token('color.background.danger'),
                color: token('color.text.danger'),
                borderRadius: 4,
                fontSize: 'var(--ds-font-size-200)',
              }}
            >
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: `1px solid ${token('color.border')}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button onClick={onClose} disabled={submitting} style={secondaryBtnStyle}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            style={{
              ...primaryBtnStyle,
              opacity: !isValid || submitting ? 0.5 : 1,
              cursor: !isValid || submitting ? 'default' : 'pointer',
            }}
          >
            {submitting ? 'Creating…' : 'Create product line'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 'var(--ds-font-size-400)',
  borderRadius: 4,
  border: `1px solid ${token('color.border.input')}`,
  background: token('color.background.input'),
  color: token('color.text'),
  outline: 'none',
  fontFamily: 'inherit',
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '4px 14px',
  fontSize: 'var(--ds-font-size-400)',
  fontWeight: 500,
  borderRadius: 3,
  border: 'none',
  background: 'transparent',
  color: token('color.text'),
  cursor: 'pointer',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '4px 14px',
  fontSize: 'var(--ds-font-size-400)',
  fontWeight: 500,
  borderRadius: 3,
  border: 'none',
  background: token('color.background.brand.bold'),
  color: token('color.text.inverse'),
};

export default CreateProductModal;
