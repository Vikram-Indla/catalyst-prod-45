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
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { token } from '@atlaskit/tokens';

interface CreateProductModalProps {
  open: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#6554C0', // purple
  '#00875A', // green
  '#0052CC', // blue
  '#FF8B00', // orange
  '#DE350B', // red
  '#5243AA', // indigo
  '#42526E', // slate
  '#c69c6d', // tan (default products migration color)
];

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
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setName('');
      setCode('');
      setCodeManuallyEdited(false);
      setDescription('');
      setColor(PRESET_COLORS[0]);
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
      const { data, error } = await (supabase as any)
        .from('products')
        .insert({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim() || null,
          color,
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

      toast.success(`Product "${data.name}" created`);
      queryClient.invalidateQueries({ queryKey: ['product-hub', 'products'] });
      onClose();
      navigate(`/product-hub/${data.code}/dashboard`);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to create product');
      setSubmitting(false);
    }
  }, [name, code, description, color, isValid, navigate, onClose, queryClient]);

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
        background: 'rgba(9, 30, 66, 0.54)',
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
        <div style={{ padding: '20px 24px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2
            id="create-product-title"
            style={{ fontSize: 18, fontWeight: 600, margin: 0, color: token('color.text') }}
          >
            Create product
          </h2>
          <button
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            style={{ background: 'transparent', border: 'none', cursor: submitting ? 'default' : 'pointer', padding: 4, color: token('color.text.subtle') }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '8px 24px 16px', overflowY: 'auto', flex: 1 }}>
          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="product-name" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: token('color.text') }}>
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
            <label htmlFor="product-code" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: token('color.text') }}>
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
            <p style={{ fontSize: 11, color: token('color.text.subtle'), margin: '4px 0 0' }}>
              Used in URLs: /product-hub/{code || 'CODE'}/backlog
            </p>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="product-description" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: token('color.text') }}>
              Description <span style={{ fontWeight: 400, color: token('color.text.subtle') }}>(optional)</span>
            </label>
            <textarea
              id="product-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this product line covers"
              disabled={submitting}
              rows={3}
              style={{ ...inputStyle, fontFamily: 'var(--cp-font-body)', resize: 'vertical' }}
            />
          </div>

          {/* Color */}
          <div style={{ marginBottom: 4 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: token('color.text') }}>
              Color
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map((c) => {
                const selected = color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    disabled={submitting}
                    aria-label={`Color ${c}`}
                    aria-pressed={selected}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: c,
                      border: selected ? `2px solid ${token('color.border.selected')}` : '2px solid transparent',
                      boxShadow: selected ? `0 0 0 2px ${token('color.background.selected.bold')}` : 'none',
                      cursor: submitting ? 'default' : 'pointer',
                      padding: 0,
                    }}
                  />
                );
              })}
            </div>
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
                fontSize: 12,
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
            {submitting ? 'Creating…' : 'Create product'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 14,
  borderRadius: 4,
  border: `1px solid ${token('color.border.input')}`,
  background: token('color.background.input'),
  color: token('color.text'),
  outline: 'none',
  fontFamily: 'inherit',
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: 14,
  fontWeight: 500,
  borderRadius: 3,
  border: 'none',
  background: 'transparent',
  color: token('color.text'),
  cursor: 'pointer',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: 14,
  fontWeight: 500,
  borderRadius: 3,
  border: 'none',
  background: token('color.background.brand.bold'),
  color: token('color.text.inverse'),
};

export default CreateProductModal;
