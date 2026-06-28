/**
 * ManageWarningsDialog — toggle Open PRs / Unreviewed code / Failing builds.
 *
 * Toggles render green-on/black-off with check/cross glyphs.
 * Settings stored in localStorage keyed per space; broadcast via event so
 * the Work items section can read them.
 */
import React, { useEffect, useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import WarningIcon from '@atlaskit/icon/glyph/warning';

const STORE_KEY = 'release-warnings-settings';

export interface WarningSettings {
  openPullRequests: boolean;
  unreviewedCode: boolean;
  failingBuilds: boolean;
}

const DEFAULT: WarningSettings = {
  openPullRequests: true,
  unreviewedCode: true,
  failingBuilds: true,
};

export function loadWarningSettings(): WarningSettings {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT, ...parsed };
  } catch {
    return DEFAULT;
  }
}

export function saveWarningSettings(s: WarningSettings) {
  localStorage.setItem(STORE_KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent('catalyst:warning-settings', { detail: s }));
}

const GREEN_BG = 'var(--ds-background-success-bold)';
const OFF_BG = 'var(--ds-text)';
const TEXT = 'var(--ds-text)';
const SUBTLE = 'var(--ds-text-subtle)';

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        all: 'unset',
        cursor: 'pointer',
        position: 'relative',
        width: 44,
        height: 24,
        borderRadius: 12,
        background: checked ? GREEN_BG : OFF_BG,
        transition: 'background 120ms ease',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: checked ? 'flex-end' : 'flex-start',
        padding: '0 3px',
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: 'var(--ds-text-inverse)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: checked ? GREEN_BG : OFF_BG,
        }}
      >
        {checked ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
      </span>
    </button>
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ManageWarningsDialog({ isOpen, onClose }: Props) {
  const [settings, setSettings] = useState<WarningSettings>(DEFAULT);

  useEffect(() => { if (isOpen) setSettings(loadWarningSettings()); }, [isOpen]);

  const handleSave = () => {
    saveWarningSettings(settings);
    onClose();
  };

  const row = (
    title: string,
    desc: string,
    key: keyof WarningSettings,
  ) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--ds-border)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 700, color: TEXT, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 'var(--ds-font-size-300)', color: SUBTLE }}>{desc}</div>
      </div>
      <Toggle
        checked={settings[key]}
        onChange={(v) => setSettings((s) => ({ ...s, [key]: v }))}
        label={title}
      />
    </div>
  );

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width={867}>
          <ModalHeader hasCloseButton>
            <ModalTitle>Manage warnings</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p style={{ margin: 0, fontSize: 'var(--ds-font-size-400)', color: TEXT }}>
              Warnings will be displayed when the status of a Jira work item doesn't accurately reflect related development activity.
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 14px',
                marginTop: 12,
                background: 'var(--ds-background-warning)',
                border: '1px solid var(--ds-border-warning)',
                borderRadius: 4,
                color: TEXT,
                fontSize: 'var(--ds-font-size-300)',
              }}
            >
              <span style={{ color: 'var(--ds-icon-warning)', display: 'inline-flex' }}>
                <WarningIcon label="" primaryColor="var(--ds-icon-warning)" />
              </span>
              <span>These warning settings affect all existing and future versions in this space.</span>
            </div>
            <div style={{ marginTop: 4 }}>
              {row(
                'Open pull requests',
                "These work items have been marked complete but have open pull requests.",
                'openPullRequests',
              )}
              {row(
                'Unreviewed code',
                "These work items have been marked complete but the commits are not part of a pull request or review.",
                'unreviewedCode',
              )}
              {row(
                'Failing builds',
                "These work items have been marked complete but have failing builds.",
                'failingBuilds',
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="primary" onClick={handleSave}>Save</Button>
            <Button appearance="subtle" onClick={onClose}>Cancel</Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
