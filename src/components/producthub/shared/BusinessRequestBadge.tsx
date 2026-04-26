import React from 'react';

/**
 * Canonical Business Request badge — Atlaskit lightbulb icon + "Business Request" label.
 * Used everywhere a Business Request type is rendered (cards, drawer, kanban, table, roadmap).
 */
export const BUSINESS_REQUEST_COLOR = '#B38600';

export interface BusinessRequestIconProps {
  size?: number;
}

export const BusinessRequestIcon: React.FC<BusinessRequestIconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
    <path
      fill="#B38600"
      d="M10 12.5H6V14a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5zm-2-11c-3.022 0-4.935 3.243-3.473 5.888L5.535 9.21c.303.548.463 1.164.465 1.79h4a3.7 3.7 0 0 1 .465-1.79l1.008-1.822C12.935 4.743 11.022 1.5 8 1.5M11.5 14a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-2.988a2.2 2.2 0 0 0-.277-1.075L3.215 8.114C1.2 4.47 3.835 0 8 0c4.164 0 6.8 4.47 4.785 8.114l-1.008 1.823a2.2 2.2 0 0 0-.277 1.075z"
    />
  </svg>
);

export interface BusinessRequestBadgeProps {
  iconSize?: number;
  fontSize?: number;
  fontWeight?: number;
  gap?: number;
}

export const BusinessRequestBadge: React.FC<BusinessRequestBadgeProps> = ({
  iconSize = 14,
  fontSize = 11,
  fontWeight = 500,
  gap = 6,
}) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap }}>
    <BusinessRequestIcon size={iconSize} />
    <span style={{ fontSize, fontWeight, color: BUSINESS_REQUEST_COLOR }}>Business Request</span>
  </div>
);
