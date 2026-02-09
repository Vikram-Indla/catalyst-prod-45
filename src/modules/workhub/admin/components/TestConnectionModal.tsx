import { useEffect, useState, useRef, useCallback } from 'react';
import { X, Check, AlertCircle, Loader2, Circle } from 'lucide-react';

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  duration_ms: number;
}

interface TestConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  checks: CheckResult[];
  isRunning: boolean;
  error?: string | null;
}

export function TestConnectionModal({ isOpen, onClose, checks, isRunning, error }: TestConnectionModalProps) {
  const [totalDuration, setTotalDuration] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (checks.length > 0) {
      setTotalDuration(checks.reduce((sum, c) => sum + c.duration_ms, 0));
    }
  }, [checks]);

  // Staggered animation: reveal checks one by one
  useEffect(() => {
    if (!isOpen) { setVisibleCount(0); return; }
    if (checks.length === 0) { setVisibleCount(0); return; }
    if (visibleCount < checks.length) {
      const timer = setTimeout(() => setVisibleCount(v => v + 1), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, checks.length, visibleCount]);

  // Escape key handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !isRunning) onClose();
    // Focus trap
    if (e.key === 'Tab' && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [isRunning, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus the close button on open
      setTimeout(() => closeButtonRef.current?.focus(), 50);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const allCheckNames = ['Authentication', 'Project Access', 'Issue Read', 'Version Read', 'Write Detection'];
  const allPassed = !isRunning && checks.length > 0 && checks.every(c => c.passed);
  const hasFailed = checks.some(c => !c.passed);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !isRunning) onClose(); }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Testing Jira Connection"
        style={{
          width: 480, background: 'var(--wh-bg)', borderRadius: 12,
          boxShadow: 'var(--wh-shm)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--wh-bdr)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontFamily: 'var(--wh-fh)', fontWeight: 700, fontSize: 16, color: 'var(--wh-tx)' }}>
            Testing Jira Connection
          </span>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            disabled={isRunning}
            aria-label="Close dialog"
            style={{
              border: 'none', background: 'none', cursor: isRunning ? 'not-allowed' : 'pointer',
              color: 'var(--wh-tx3)', padding: 4,
            }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {error && (
            <div style={{
              background: 'var(--wh-dng-bg)', border: '1px solid var(--wh-dng)',
              borderRadius: 'var(--wh-rad)', padding: '10px 14px', marginBottom: 16,
              fontSize: 13, color: 'var(--wh-dng)',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {allCheckNames.map((name, idx) => {
              const check = checks.find(c => c.name === name);
              const isRevealed = idx < visibleCount;
              const isCurrentlyRunning = isRunning && checks.length === idx && !hasFailed;
              const isSkipped = hasFailed && !check;
              const isPending = !check && !isCurrentlyRunning && !isSkipped;

              return (
                <div
                  key={name}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    opacity: check ? (isRevealed ? 1 : 0) : (isCurrentlyRunning ? 1 : isPending ? 0.4 : 0.4),
                    transform: check && !isRevealed ? 'translateY(4px)' : 'translateY(0)',
                    transition: 'opacity 0.3s ease, transform 0.3s ease',
                  }}
                >
                  {/* Icon */}
                  <div style={{ width: 22, height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {check?.passed && isRevealed ? (
                      <Check style={{ width: 18, height: 18, color: 'var(--wh-suc)' }} />
                    ) : check && !check.passed && isRevealed ? (
                      <AlertCircle style={{ width: 18, height: 18, color: 'var(--wh-dng)' }} />
                    ) : isCurrentlyRunning ? (
                      <Loader2 style={{ width: 18, height: 18, color: 'var(--wh-pri)', animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Circle style={{ width: 16, height: 16, color: 'var(--wh-tx4)' }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: 600, fontSize: 13, color: check && isRevealed ? 'var(--wh-tx)' : 'var(--wh-tx4)',
                      fontFamily: 'var(--wh-fn)',
                    }}>
                      {name}
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: check?.passed && isRevealed ? 'var(--wh-tx3)' : check && isRevealed ? 'var(--wh-dng)' : 'var(--wh-tx4)',
                      marginTop: 2, fontFamily: 'var(--wh-fn)',
                    }}>
                      {check && isRevealed ? check.message : isCurrentlyRunning ? 'Checking...' : isSkipped ? 'Skipped' : 'Pending...'}
                    </div>
                  </div>

                  {/* Duration */}
                  {check && isRevealed && (
                    <span style={{
                      fontSize: 11, color: 'var(--wh-tx4)', fontFamily: 'var(--wh-mo)',
                      whiteSpace: 'nowrap',
                    }}>
                      {check.duration_ms}ms
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--wh-bdr)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: 'var(--wh-tx3)', fontFamily: 'var(--wh-mo)' }}>
            {isRunning ? 'Running checks...' : `Total: ${totalDuration}ms`}
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {allPassed && (
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--wh-suc)' }}>
                All checks passed ✓
              </span>
            )}
            <button
              className="wh-btn-secondary"
              onClick={onClose}
              disabled={isRunning}
              style={{ height: 34, padding: '0 16px', fontSize: 13 }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
