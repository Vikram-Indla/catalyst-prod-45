import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="h-[72px] border-b border-[#E8E8E8] bg-white">
      <div className="h-full flex items-center justify-between px-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#1A1A1A]">{title}</h1>
          {subtitle && (
            <p className="text-sm text-[#8C8C8C]">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
