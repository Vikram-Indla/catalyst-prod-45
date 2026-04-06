import { useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, CheckCircle2, XCircle, 
  AlertTriangle, SkipForward, RotateCcw
} from 'lucide-react';

interface ExecutionActionBarProps {
  currentIndex: number;
  totalCount: number;
  currentStatus: string;
  onPrevious: () => void;
  onNext: () => void;
  onPass: () => void;
  onFail: () => void;
  onBlocked: () => void;
  onSkip: () => void;
  onReset: () => void;
  isSubmitting: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export function ExecutionActionBar({
  currentIndex,
  totalCount,
  currentStatus,
  onPrevious,
  onNext,
  onPass,
  onFail,
  onBlocked,
  onSkip,
  onReset,
  isSubmitting,
  canGoPrevious,
  canGoNext,
}: ExecutionActionBarProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case 'p': if (!isSubmitting) onPass(); break;
        case 'f': if (!isSubmitting) onFail(); break;
        case 'b': if (!isSubmitting) onBlocked(); break;
        case 's': if (!isSubmitting) onSkip(); break;
        case 'arrowleft': if (canGoPrevious) onPrevious(); break;
        case 'arrowright': if (canGoNext) onNext(); break;
        case 'r':
          if ((e.ctrlKey || e.metaKey) && !isSubmitting && currentStatus !== 'not_run') {
            e.preventDefault();
            onReset();
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, canGoPrevious, canGoNext, currentStatus, onPass, onFail, onBlocked, onSkip, onPrevious, onNext, onReset]);

  const isExecuted = currentStatus !== 'not_run';

  const actionButtons = [
    { key: 'passed', label: 'Pass', shortcut: 'P', icon: CheckCircle2, onClick: onPass, activeGradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', inactiveBg: 'var(--tint-green-soft, #ECFDF5)', activeColor: '#FFFFFF', inactiveColor: 'var(--sem-success)', shadow: 'rgba(16,185,129,0.3)' },
    { key: 'failed', label: 'Fail', shortcut: 'F', icon: XCircle, onClick: onFail, activeGradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', inactiveBg: 'var(--tint-red, #FEF2F2)', activeColor: '#FFFFFF', inactiveColor: 'var(--sem-danger)', shadow: 'rgba(220,38,38,0.3)' },
    { key: 'blocked', label: 'Blocked', shortcut: 'B', icon: AlertTriangle, onClick: onBlocked, activeGradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', inactiveBg: '#FFFBEB', activeColor: '#FFFFFF', inactiveColor: 'var(--sem-warning)', shadow: 'rgba(217,119,6,0.3)' },
    { key: 'skipped', label: 'Skip', shortcut: 'S', icon: SkipForward, onClick: onSkip, activeGradient: 'linear-gradient(135deg, #64748B 0%, #475569 100%)', inactiveBg: '#FFFFFF', activeColor: '#FFFFFF', inactiveColor: 'var(--fg-3)', shadow: 'rgba(100,116,139,0.3)' },
  ];

  return (
    <div style={{ padding: '16px 24px', backgroundColor: 'var(--cp-float)', borderTop: '1px solid var(--divider)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, position: 'relative' }}>
      <div style={{ position: 'absolute', left: 24, fontSize: 13, color: 'var(--fg-3)' }}>
        Test {currentIndex + 1} of {totalCount}
      </div>

      <button onClick={onPrevious} disabled={!canGoPrevious || isSubmitting}
        style={{ height: 44, padding: '0 16px', border: '1.5px solid var(--divider)', borderRadius: 8, backgroundColor: 'var(--cp-float)', color: canGoPrevious ? 'var(--fg-2)' : 'var(--fg-4)', fontSize: 14, fontWeight: 500, cursor: canGoPrevious ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, opacity: canGoPrevious ? 1 : 0.5 }}>
        <ChevronLeft size={18} /> Prev
      </button>

      <div style={{ display: 'flex', gap: 8 }}>
        {actionButtons.map(btn => {
          const Icon = btn.icon;
          const isActive = currentStatus === btn.key;
          return (
            <button key={btn.key} onClick={btn.onClick} disabled={isSubmitting} title={`${btn.label} (${btn.shortcut})`}
              style={{
                height: 44, padding: '0 24px', border: isActive || btn.key !== 'skipped' ? 'none' : '1.5px solid var(--bd-default, #E2E8F0)', borderRadius: 8,
                background: isActive ? btn.activeGradient : btn.inactiveBg,
                color: isActive ? btn.activeColor : btn.inactiveColor,
                fontSize: 14, fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                opacity: isSubmitting ? 0.7 : 1, boxShadow: isActive ? `0 2px 8px ${btn.shadow}` : 'none',
              }}>
              <Icon size={18} /> {btn.label}
              <span style={{ fontSize: 11, opacity: 0.7, padding: '2px 6px', backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : `${btn.inactiveColor}15`, borderRadius: 4 }}>
                {btn.shortcut}
              </span>
            </button>
          );
        })}
      </div>

      {isExecuted && (
        <button onClick={onReset} disabled={isSubmitting} title="Reset to Not Run (Ctrl+R)"
          style={{ height: 44, padding: '8px 12px', border: '1.5px solid var(--divider)', borderRadius: 8, backgroundColor: 'var(--cp-float)', color: 'var(--fg-3)', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RotateCcw size={16} />
        </button>
      )}

      <button onClick={onNext} disabled={!canGoNext || isSubmitting}
        style={{ height: 44, padding: '0 16px', border: '1.5px solid var(--divider)', borderRadius: 8, backgroundColor: 'var(--cp-float)', color: canGoNext ? 'var(--fg-2)' : 'var(--fg-4)', fontSize: 14, fontWeight: 500, cursor: canGoNext ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, opacity: canGoNext ? 1 : 0.5 }}>
        Next <ChevronRight size={18} />
      </button>

      <div style={{ position: 'absolute', right: 24, fontSize: 11, color: 'var(--fg-4)' }}>
        ← → to navigate • P F B S to record
      </div>
    </div>
  );
}
