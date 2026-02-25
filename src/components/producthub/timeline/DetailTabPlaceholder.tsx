// =====================================================
// DETAIL TAB — Placeholder for future tabs (Lucide icons only)
// =====================================================

import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface DetailTabPlaceholderProps {
  icon: LucideIcon;
  label: string;
}

export const DetailTabPlaceholder: React.FC<DetailTabPlaceholderProps> = ({ icon: Icon, label }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <Icon className="w-8 h-8 text-muted-foreground mb-3" />
    <p className="text-[14px] font-medium text-muted-foreground">
      {label} — Coming soon
    </p>
  </div>
);

export default DetailTabPlaceholder;
