/**
 * WebLinkForm — URL + Link Text inputs used inside WebLinksSection.
 *
 * Spec:
 *   - URL autofocuses on mount (or when caller forces refocus via key change)
 *   - Both inputs have dark gray border idle, blue when focused
 *   - URL field turns red-bg on invalid value (must start with http:// or https://)
 *   - "Link" button disabled until URL is non-empty; blue bg + white text when enabled
 *   - Submitting via Enter or the Link button calls onSubmit with the URL + link_text
 *   - Cancel via Cancel button or Esc
 */
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import './web-links.css';

const HTTP_URL_RE = /^https?:\/\/\S+/i;

export interface WebLinkFormHandle {
  /** Focus the URL field (used by the section "+" header button when the form is already open). */
  focusUrl: () => void;
}

export interface WebLinkFormProps {
  onSubmit: (input: { url: string; link_text: string | null }) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const WebLinkForm = forwardRef<WebLinkFormHandle, WebLinkFormProps>(function WebLinkForm(
  { onSubmit, onCancel, isSubmitting },
  ref,
) {
  const [url, setUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [urlTouched, setUrlTouched] = useState(false);
  const [urlFocused, setUrlFocused] = useState(false);
  const [textFocused, setTextFocused] = useState(false);

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
  const urlIsInvalid = !urlIsEmpty && !HTTP_URL_RE.test(url.trim());
  // Real-time validation: as soon as the user types non-empty content
  // that fails the scheme regex, paint the red border + show the inline
  // error. The empty case is signaled only by the disabled Link button —
  // we don't yell "URL is required" while the user hasn't started typing.
  const showUrlError = urlIsInvalid || (urlTouched && urlIsEmpty);
  const canSubmit = !urlIsEmpty && !urlIsInvalid && !isSubmitting;

  const handleSubmit = async () => {
    setUrlTouched(true);
    if (!canSubmit) return;
    await onSubmit({
      url: url.trim(),
      link_text: linkText.trim().length > 0 ? linkText.trim() : null,
    });
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

  const inputStyle = (focused: boolean, error: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '4px 8px',
    fontSize: 'var(--ds-font-size-400)',
    fontFamily: 'var(--cp-font-body)',
    color: 'var(--ds-text)',
    background: error
      ? 'var(--ds-background-danger)'
      : 'var(--cp-bg-elevated)',
    // Error always wins — even while the field is focused, the red
    // border + bg signals invalid input. Only when there is no error
    // do we paint the focused-blue border.
    border: error
      ? `2px solid var(--ds-border-danger)`
      : `${focused ? 2 : 1}px solid ${focused
          ? 'var(--ds-border-focused)'
          : 'var(--ds-border)'}`,
    borderRadius: 3,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'background 0.15s, border-color 0.15s, border-width 0.15s',
  });

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--ds-font-size-100)',
    fontWeight: 700,
    color: 'var(--ds-text)',
    textTransform: 'uppercase',
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
      {/* URL + Link Text inline, equal width, each with a label above. */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <label htmlFor="web-link-url" style={labelStyle}>URL</label>
          <input
            ref={urlInputRef}
            id="web-link-url"
            className="web-link-input"
            data-error={showUrlError ? 'true' : 'false'}
            type="text"
            value={url}
            placeholder="https://www.example.com"
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => { setUrlFocused(false); setUrlTouched(true); }}
            onFocus={() => setUrlFocused(true)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            style={inputStyle(urlFocused, showUrlError)}
            aria-invalid={showUrlError}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <label htmlFor="web-link-text" style={labelStyle}>Link text</label>
          <input
            id="web-link-text"
            className="web-link-input"
            data-error="false"
            type="text"
            value={linkText}
            placeholder="Add a description"
            onChange={(e) => setLinkText(e.target.value)}
            onFocus={() => setTextFocused(true)}
            onBlur={() => setTextFocused(false)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            style={inputStyle(textFocused, false)}
          />
        </div>
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
            ? 'URL is required.'
            : 'Enter a valid URL that starts with http:// or https://'}
        </span>
      )}

      {/* Buttons below at the right end: Link first, then Cancel. */}
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

export default WebLinkForm;
