// ============================================================
// PAGE HEADER - Linear Style with Gradient Icon
// ============================================================

import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import React from 'react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ 
  icon: Icon, 
  title, 
  subtitle, 
  actions,
  className 
}: PageHeaderProps) {
  return (
    <header className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center shadow-lg shadow-blue-600/25">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-[28px] font-bold text-slate-900 tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </header>
  );
}

// Keyboard shortcut indicator
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center justify-center min-w-5 h-5 px-1.5",
      "bg-slate-100 border border-slate-200 rounded",
      "text-[11px] font-semibold text-slate-500",
      className
    )}>
      {children}
    </span>
  );
}

export function KbdPrimary({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 bg-white/20 border border-white/30 rounded text-[11px] font-semibold text-white/90">
      {children}
    </span>
  );
}
