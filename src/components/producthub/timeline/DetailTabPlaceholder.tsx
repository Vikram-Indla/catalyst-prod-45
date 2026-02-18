// =====================================================
// DETAIL TAB — Placeholder for future tabs
// =====================================================

import React from 'react';

interface DetailTabPlaceholderProps {
  emoji: string;
  label: string;
}

export const DetailTabPlaceholder: React.FC<DetailTabPlaceholderProps> = ({ emoji, label }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <span className="text-[32px] mb-3">{emoji}</span>
    <p className="text-[14px] font-medium text-muted-foreground">
      {label} — Coming soon
    </p>
  </div>
);

export default DetailTabPlaceholder;
