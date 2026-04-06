import React from 'react';
import { RefreshCw, Package, TestTube2, Link2, ShieldCheck, AlertCircle } from 'lucide-react';
import { RH } from '@/constants/releasehub.design';

interface Props {
  icon?: React.ElementType;
  title: string;
  subtitle?: string;
  actions?: { label: string; onClick: () => void; variant?: 'primary' | 'ghost' | 'teal' }[];
  className?: string;
}

const VARIANT_CLASSES = {
  primary: 'bg-[#2563EB] text-white hover:bg-[#1D4ED8]',
  ghost: 'border border-[#C9D3E0] text-[rgba(237,237,237,0.93)] hover:bg-[#F4F7FA]',
  teal: 'border border-[#0D9488] text-[#0D9488] hover:bg-[#F0FDFA]',
};

export function EmptyState({ icon: Icon = Package, title, subtitle, actions, className = '' }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`} aria-live="polite">
      <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] flex items-center justify-center mb-4">
        <Icon size={24} className="text-[rgba(237,237,237,0.40)]" />
      </div>
      <h3 className="text-[14px] font-bold mb-1" style={{ fontFamily: RH.fontDisplay, color: RH.ink2 }}>{title}</h3>
      {subtitle && <p className="text-[13px] text-[var(--fg-3)] max-w-sm text-center mb-4" style={{ fontFamily: RH.fontBody }}>{subtitle}</p>}
      {actions && actions.length > 0 && (
        <div className="flex items-center gap-2">
          {actions.map(a => (
            <button key={a.label} onClick={a.onClick}
              className={`h-8 px-3.5 rounded-md text-[13px] font-semibold transition-colors ${VARIANT_CLASSES[a.variant || 'primary']}`}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12" aria-live="assertive">
      <div className="w-12 h-12 rounded-xl bg-[rgba(248,113,113,0.06)] flex items-center justify-center mb-4">
        <AlertCircle size={24} className="text-[#DC2626]" />
      </div>
      <h3 className="text-[14px] font-bold mb-1" style={{ fontFamily: RH.fontDisplay, color: 'var(--sem-danger)' }}>Something went wrong</h3>
      <p className="text-[13px] text-[rgba(237,237,237,0.40)] mb-4">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="h-8 px-3.5 rounded-md text-[13px] font-semibold bg-[#2563EB] text-white hover:bg-[#1D4ED8]">
          Retry
        </button>
      )}
    </div>
  );
}
