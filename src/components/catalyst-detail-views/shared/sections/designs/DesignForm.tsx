/**
 * DesignForm — single-field Figma URL input used inside DesignsSection.
 *
 * Spec mirror of WebLinkForm except:
 *   - One field, not two (URL only — no link_text)
 *   - Label: "Link a Figma URL"
 *   - Placeholder: a real-looking Figma URL
 *   - Validation: URL must start with https://(www.)?figma.com/
 *
 * Uses the same `web-link-input` class + `data-error` override so the
 * focused border respects red on error (defeats the global !important
 * blue rule from index.css:2731).
 */
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import '../web-links/web-links.css';

const FIGMA_URL_RE = /^https?:\/\/(?:www\.)?figma\.com\//i;

export interface DesignFormHandle {
  focusUrl: () => void;
}

export interface DesignFormProps {
  onSubmit: (url: string) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const DesignForm = forwardRef<DesignFormHandle, DesignFormProps>(function DesignForm(
  { onSubmit, onCancel, isSubmitting },
  ref,
) {
  const [url, setUrl] = useState('');
  const [urlTouched, setUrlTouched] = useState(false);
  const [urlFocused, setUrlFocused] = useState(false);

  const urlInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focusUrl: () => {
      urlInputRef.current?.focus();
      urlInputRef.current?.select();
    },
  }), []);

  useEffect(() => {
    urlInputRef.current?.focus({ preventScroll: true });
  }, []);

  const urlIsEmpty = url.trim().length === 0;
  const urlIsInvalid = !urlIsEmpty && !FIGMA_URL_RE.test(url.trim());
  const showUrlError = urlIsInvalid || (urlTouched && urlIsEmpty);
  const canSubmit = !urlIsEmpty && !urlIsInvalid && !isSubmitting;

  const handleSubmit = async () => {
    setUrlTouched(true);
    if (!canSubmit) return;
    await onSubmit(url.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '4px 8px',
    fontSize: 'var(--ds-font-size-400)',
    fontFamily: 'var(--cp-font-body)',
    color: 'var(--ds-text)',
    background: showUrlError
      ? 'var(--ds-background-danger)'
      : 'var(--cp-bg-elevated)',
    border: showUrlError
      ? `2px solid var(--ds-border-danger)`
      : `${urlFocused ? 2 : 1}px solid ${urlFocused
          ? 'var(--ds-border-focused)'
          : 'var(--ds-border)'}`,
    borderRadius: 3,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'background 0.15s, border-color 0.15s, border-width 0.15s',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--ds-font-size-100)',
    fontWeight: 700,
    color: 'var(--ds-text)',
    letterSpacing: '0.3px',
    fontFamily: 'var(--cp-font-body)',
    marginBottom: 4,
    display: 'block',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '8px 0 4px 0',
      }}
    >
      <div>
        <label htmlFor="design-figma-url" style={labelStyle}>Link a Figma URL</label>
        <input
          ref={urlInputRef}
          id="design-figma-url"
          className="web-link-input"
          data-error={showUrlError ? 'true' : 'false'}
          type="text"
          value={url}
          placeholder="https://www.figma.com/file/xxx/my-file?node-id=xxx"
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => { setUrlFocused(false); if (url.trim()) setUrlTouched(true); }}
          onFocus={() => setUrlFocused(true)}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          style={inputStyle}
          aria-invalid={showUrlError}
        />
      </div>

      {showUrlError && (
        <span
          style={{
            fontSize: 'var(--ds-font-size-200)',
            color: 'var(--ds-text-danger)',
            fontFamily: 'var(--cp-font-body)',
          }}
        >
          {urlIsEmpty
            ? 'A Figma URL is required.'
            : 'Enter a valid Figma URL (must start with https://www.figma.com/)'}
        </span>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          marginTop: 4,
        }}
      >
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            padding: '4px 14px',
            fontSize: 'var(--ds-font-size-400)',
            fontWeight: 500,
            color: canSubmit
              ? 'var(--ds-text-inverse)'
              : 'var(--ds-text-disabled)',
            background: canSubmit
              ? 'var(--ds-background-brand-bold)'
              : 'var(--ds-background-disabled)',
            border: 'none',
            borderRadius: 3,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            if (!canSubmit) return;
            e.currentTarget.style.background = 'var(--ds-background-brand-bold-hovered)';
          }}
          onMouseLeave={(e) => {
            if (!canSubmit) return;
            e.currentTarget.style.background = 'var(--ds-background-brand-bold)';
          }}
        >
          {isSubmitting ? 'Linking…' : 'Link'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '4px 12px',
            fontSize: 'var(--ds-font-size-400)',
            fontWeight: 500,
            color: 'var(--ds-text-subtle)',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            borderRadius: 3,
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => {
            if (isSubmitting) return;
            e.currentTarget.style.background = 'var(--ds-background-neutral-hovered)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
});

export default DesignForm;
