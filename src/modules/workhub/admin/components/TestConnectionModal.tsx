import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (checks.length > 0) {
      setTotalDuration(checks.reduce((sum, c) => sum + c.duration_ms, 0));
    }
  }, [checks]);

  if (!isOpen) return null;

  const allCheckNames = ['Authentication', 'Project Access', 'Issue Read', 'Version Read', 'Write Detection'];
  const allPassed = !isRunning && checks.length > 0 && checks.every(c => c.passed);
  const hasFailed = checks.some(c => !c.passed);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)',
    }}
    onClick={(e) => { if (e.target === e.currentTarget && !isRunning) onClose(); }}
    >
      <div style={{
        width: 480, background: 'var(--wh-bg)', borderRadius: 'var(--wh-rad2)',
        boxShadow: 'var(--wh-shm)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--wh-bdr)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontFamily: 'var(--wh-fh)', fontWeight: 700, fontSize: 16, color: 'var(--wh-tx)' }}>
            Testing Jira Connection
          </span>
          <button onClick={onClose} disabled={isRunning} style={{
            border: 'none', background: 'none', cursor: isRunning ? 'not-allowed' : 'pointer',
            color: 'var(--wh-tx3)', padding: 4,
          }}>
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
              const isCurrentlyRunning = isRunning && checks.length === idx && !hasFailed;
              const isSkipped = hasFailed && !check;
              const isPending = !check && !isCurrentlyRunning && !isSkipped;

              return (
                <div key={name} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Icon */}
                  <div style={{ width: 22, height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {check?.passed ? (
                      <Check style={{ width: 18, height: 18, color: 'var(--wh-suc)' }} />
                    ) : check && !check.passed ? (
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
                      fontWeight: 600, fontSize: 13, color: check ? 'var(--wh-tx)' : 'var(--wh-tx4)',
                      fontFamily: 'var(--wh-fn)',
                    }}>
                      {name}
                    </div>
                    <div style={{
                      fontSize: 12, color: check?.passed ? 'var(--wh-tx3)' : check ? 'var(--wh-dng)' : 'var(--wh-tx4)',
                      marginTop: 2, fontFamily: 'var(--wh-fn)',
                    }}>
                      {check ? check.message : isCurrentlyRunning ? 'Checking...' : isSkipped ? 'Skipped' : 'Pending...'}
                    </div>
                  </div>

                  {/* Duration */}
                  {check && (
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
