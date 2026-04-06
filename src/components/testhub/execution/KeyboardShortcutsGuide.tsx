/**
 * G19: Keyboard Shortcuts Overlay
 * Triggered by pressing '?' key
 */
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const sections = [
  {
    title: 'Step Results',
    shortcuts: [
      { key: 'P', desc: 'Pass step' },
      { key: 'F', desc: 'Fail step' },
      { key: 'B', desc: 'Block step' },
      { key: 'S', desc: 'Skip step' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { key: '→ / N', desc: 'Next step' },
      { key: '←', desc: 'Previous step' },
      { key: 'Home', desc: 'First step' },
      { key: 'End', desc: 'Last step' },
      { key: '1-9', desc: 'Jump to step' },
    ],
  },
  {
    title: 'Test Actions',
    shortcuts: [
      { key: 'Ctrl+Enter', desc: 'Complete execution (derive status)' },
      { key: 'Ctrl+S', desc: 'Save progress' },
    ],
  },
  {
    title: 'Other',
    shortcuts: [
      { key: 'D', desc: 'Create defect' },
      { key: 'A', desc: 'Add attachment' },
      { key: '?', desc: 'Show shortcuts' },
      { key: 'Esc', desc: 'Close modal' },
    ],
  },
];

export function KeyboardShortcutsGuide({ isOpen, onClose }: KeyboardShortcutsGuideProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 1100,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 580, backgroundColor: 'var(--bg-app)', borderRadius: 16,
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--divider)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Keyboard size={20} style={{ color: 'var(--cp-blue)' }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: 0 }}>
              Keyboard Shortcuts
            </h2>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, border: 'none', borderRadius: 8,
            backgroundColor: 'transparent', color: 'var(--fg-3)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {sections.map(section => (
            <div key={section.title}>
              <h3 style={{
                fontSize: 11, fontWeight: 700, color: 'var(--fg-3)',
                textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px',
              }}>
                {section.title}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {section.shortcuts.map(s => (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--fg-1)' }}>{s.desc}</span>
                    <kbd style={{
                      fontSize: 11, fontWeight: 600, fontFamily: 'monospace',
                      padding: '3px 8px', backgroundColor: 'var(--bg-2)',
                      border: '1px solid var(--divider)', borderRadius: 6,
                      color: 'var(--fg-1)', minWidth: 28, textAlign: 'center',
                    }}>
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid var(--divider)',
          textAlign: 'center', color: 'var(--fg-3)', fontSize: 12,
        }}>
          Press <kbd style={{ padding: '2px 6px', backgroundColor: 'var(--bg-2)', border: '1px solid var(--divider)', borderRadius: 4, fontSize: 11, fontFamily: 'monospace' }}>Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}
