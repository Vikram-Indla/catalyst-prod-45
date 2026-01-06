/**
 * Settings Layout - Container with sidebar and content area
 */

import React from 'react';

interface SettingsLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function SettingsLayout({
  sidebar,
  children,
  title,
  subtitle,
  actions,
}: SettingsLayoutProps) {
  return (
    <div className="flex h-full bg-muted/30">
      {sidebar}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-5 bg-gradient-to-b from-background to-muted/50 border-b border-border">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
