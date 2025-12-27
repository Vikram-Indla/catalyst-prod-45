import React from 'react';
import { useWorkItemIconPreferences, IconStyle } from '@/hooks/useWorkItemIconPreferences';
import type { WorkItemType } from '@/config/workItemConfig';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Icon colors that work in both light and dark modes (from Catalyst design system)
const ICON_COLORS: Record<string, string> = {
  // Enterprise
  theme: '#0d9488',      // Teal
  objective: '#2563eb',  // Blue
  
  // Product
  'business-request': '#8b7355', // Bronze
  
  // Program
  epic: '#904EE2',       // Purple
  
  // Project
  feature: '#F59E0B',    // Amber
  story: '#36B37E',      // Green
  task: '#0065FF',       // Blue
  defect: '#FF5630',     // Red
  incident: '#EF4444',   // Red-500
  
  // Other
  dependency: '#3B82F6', // Blue
  risk: '#F97316',       // Orange
};

// Alternative colors for outline style (slightly muted for balance)
const OUTLINE_COLORS: Record<string, string> = {
  theme: '#14b8a6',
  objective: '#3b82f6',
  'business-request': '#9c8466',
  epic: '#a060f0',
  feature: '#fbbf24',
  story: '#4ade80',
  task: '#3b82f6',
  defect: '#f87171',
  incident: '#f87171',
  dependency: '#60a5fa',
  risk: '#fb923c',
};

// Work item type labels for tooltips
const WORK_ITEM_LABELS: Record<string, string> = {
  theme: 'Theme',
  objective: 'Objective',
  'business-request': 'Business Request',
  epic: 'Epic',
  feature: 'Feature',
  story: 'Story',
  task: 'Task',
  defect: 'Defect',
  incident: 'Incident',
  dependency: 'Dependency',
  risk: 'Risk',
};

interface WorkItemIconProps {
  type: string;
  size?: number;
  className?: string;
  /** Override the icon style from preferences */
  forceStyle?: IconStyle;
  /** Disable tooltip (useful when parent already has tooltip) */
  hideTooltip?: boolean;
}

/**
 * Universal Work Item Icon component that respects admin-configured icon styles.
 * Automatically updates across the application when settings change.
 * Includes tooltip showing work item type on hover.
 */
export function WorkItemIcon({ type, size = 16, className = '', forceStyle, hideTooltip = false }: WorkItemIconProps) {
  const { getIconStyle } = useWorkItemIconPreferences();
  
  const iconStyle = forceStyle || getIconStyle(type);
  const color = ICON_COLORS[type] || '#6b7280';
  const outlineColor = OUTLINE_COLORS[type] || color;
  const label = WORK_ITEM_LABELS[type] || type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' ');
  
  let iconElement: React.ReactNode;
  
  switch (iconStyle) {
    case 'filled':
      iconElement = <FilledIcon type={type} size={size} color={color} className={className} />;
      break;
    case 'outline':
      iconElement = <OutlineIcon type={type} size={size} color={outlineColor} className={className} />;
      break;
    case 'minimal':
      iconElement = <MinimalIcon type={type} size={size} color={color} className={className} />;
      break;
    default:
      iconElement = <FilledIcon type={type} size={size} color={color} className={className} />;
  }
  
  if (hideTooltip) {
    return <>{iconElement}</>;
  }
  
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center justify-center" style={{ lineHeight: 0 }}>
            {iconElement}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// FILLED STYLE - Bold, colored backgrounds with white symbols (Current default)
// ============================================================================
function FilledIcon({ type, size, color, className }: { type: string; size: number; color: string; className: string }) {
  const commonProps = { width: size, height: size, viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", className };
  
  switch (type) {
    case 'theme':
      return (
        <svg {...commonProps}>
          <rect width="16" height="16" rx="3" fill={color} />
          <circle cx="8" cy="8" r="4" fill="white" opacity="0.9" />
        </svg>
      );
    case 'objective':
      return (
        <svg {...commonProps}>
          <rect width="16" height="16" rx="3" fill={color} />
          <circle cx="8" cy="8" r="4" stroke="white" strokeWidth="1.5" fill="none" />
          <circle cx="8" cy="8" r="1.5" fill="white" />
        </svg>
      );
    case 'business-request':
      return (
        <svg {...commonProps}>
          <rect width="16" height="16" rx="3" fill={color} />
          <path d="M4 12V6L8 4L12 6V12L8 14L4 12Z" stroke="white" strokeWidth="1.2" fill="none" />
          <path d="M8 4V14M4 6L12 6M4 12L12 12" stroke="white" strokeWidth="1" opacity="0.6" />
        </svg>
      );
    case 'epic':
      return (
        <svg {...commonProps}>
          <rect width="16" height="16" rx="3" fill={color} />
          <path d="M9.5 2L4 9H7.5L6.5 14L12 7H8.5L9.5 2Z" fill="white" />
        </svg>
      );
    case 'feature':
      return (
        <svg {...commonProps}>
          <rect width="16" height="16" rx="2" fill={color} />
          <path d="M9 2L5 9H8L7 14L11 7H8L9 2Z" fill="white" />
        </svg>
      );
    case 'story':
      return (
        <svg {...commonProps}>
          <rect x="2" y="1" width="12" height="14" rx="1" fill={color} />
          <path d="M5 4H11M5 7H11M5 10H9" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'task':
      return (
        <svg {...commonProps}>
          <rect width="16" height="16" rx="2" fill={color} />
          <path d="M4 8L7 11L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'defect':
      return (
        <svg {...commonProps}>
          <circle cx="8" cy="8" r="7" fill={color} />
          <circle cx="8" cy="8" r="4" fill="white" />
          <circle cx="8" cy="8" r="2" fill={color} />
        </svg>
      );
    case 'incident':
      return (
        <svg {...commonProps}>
          <rect width="16" height="16" rx="3" fill={color} />
          <path d="M8 3L13 12H3L8 3Z" fill="white" />
          <path d="M8 6V9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="10.5" r="0.75" fill={color} />
        </svg>
      );
    case 'dependency':
      return (
        <svg {...commonProps}>
          <rect width="16" height="16" rx="3" fill={color} />
          <path d="M8 3V8M8 8L5 11M8 8L11 11" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'risk':
      return (
        <svg {...commonProps}>
          <path d="M8 1L15 14H1L8 1Z" fill={color} />
          <path d="M8 5V9" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="11" r="1" fill="white" />
        </svg>
      );
    default:
      return (
        <svg {...commonProps}>
          <rect width="16" height="16" rx="3" fill="#6b7280" />
          <circle cx="8" cy="8" r="3" fill="white" />
        </svg>
      );
  }
}

// ============================================================================
// OUTLINE STYLE - Clean stroke-based icons, no fill backgrounds
// Works great in both light and dark modes
// ============================================================================
function OutlineIcon({ type, size, color, className }: { type: string; size: number; color: string; className: string }) {
  const commonProps = { width: size, height: size, viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", className };
  const stroke = color;
  const sw = "1.5";
  
  switch (type) {
    case 'theme':
      return (
        <svg {...commonProps}>
          <circle cx="8" cy="8" r="6" stroke={stroke} strokeWidth={sw} />
          <circle cx="8" cy="8" r="2.5" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case 'objective':
      return (
        <svg {...commonProps}>
          <circle cx="8" cy="8" r="6" stroke={stroke} strokeWidth={sw} />
          <circle cx="8" cy="8" r="3" stroke={stroke} strokeWidth={sw} />
          <circle cx="8" cy="8" r="1" fill={stroke} />
        </svg>
      );
    case 'business-request':
      return (
        <svg {...commonProps}>
          <rect x="2" y="3" width="12" height="10" rx="1" stroke={stroke} strokeWidth={sw} />
          <path d="M2 6H14" stroke={stroke} strokeWidth={sw} />
          <path d="M5 9H11" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case 'epic':
      return (
        <svg {...commonProps}>
          <path d="M9 2L4 9H7L6 14L12 7H9L9 2Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        </svg>
      );
    case 'feature':
      return (
        <svg {...commonProps}>
          <path d="M8 2L10 6H14L11 9L12 14L8 11L4 14L5 9L2 6H6L8 2Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        </svg>
      );
    case 'story':
      return (
        <svg {...commonProps}>
          <rect x="3" y="2" width="10" height="12" rx="1" stroke={stroke} strokeWidth={sw} />
          <path d="M5 5H11M5 8H11M5 11H8" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case 'task':
      return (
        <svg {...commonProps}>
          <rect x="2" y="2" width="12" height="12" rx="2" stroke={stroke} strokeWidth={sw} />
          <path d="M5 8L7 10L11 6" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'defect':
      return (
        <svg {...commonProps}>
          <ellipse cx="8" cy="9" rx="5" ry="4" stroke={stroke} strokeWidth={sw} />
          <path d="M3 6L5 8M13 6L11 8" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M4 4L3 2M12 4L13 2" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M8 5V3" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case 'incident':
      return (
        <svg {...commonProps}>
          <path d="M8 2L14 13H2L8 2Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M8 6V9" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <circle cx="8" cy="11" r="0.75" fill={stroke} />
        </svg>
      );
    case 'dependency':
      return (
        <svg {...commonProps}>
          <circle cx="8" cy="3" r="2" stroke={stroke} strokeWidth={sw} />
          <circle cx="4" cy="13" r="2" stroke={stroke} strokeWidth={sw} />
          <circle cx="12" cy="13" r="2" stroke={stroke} strokeWidth={sw} />
          <path d="M8 5V8M6 10L8 8L10 10" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case 'risk':
      return (
        <svg {...commonProps}>
          <path d="M8 2L14 13H2L8 2Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M8 6V9" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <circle cx="8" cy="11" r="0.75" fill={stroke} />
        </svg>
      );
    default:
      return (
        <svg {...commonProps}>
          <circle cx="8" cy="8" r="6" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
  }
}

// ============================================================================
// MINIMAL STYLE - Simple geometric shapes, subtle and modern
// Perfect for dense UIs and professional settings
// ============================================================================
function MinimalIcon({ type, size, color, className }: { type: string; size: number; color: string; className: string }) {
  const commonProps = { width: size, height: size, viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", className };
  
  switch (type) {
    case 'theme':
      return (
        <svg {...commonProps}>
          <circle cx="8" cy="8" r="6" fill={color} opacity="0.15" />
          <circle cx="8" cy="8" r="3" fill={color} />
        </svg>
      );
    case 'objective':
      return (
        <svg {...commonProps}>
          <circle cx="8" cy="8" r="6" fill={color} opacity="0.12" />
          <circle cx="8" cy="8" r="4" stroke={color} strokeWidth="1.5" fill="none" />
          <circle cx="8" cy="8" r="1.5" fill={color} />
        </svg>
      );
    case 'business-request':
      return (
        <svg {...commonProps}>
          <rect x="2" y="2" width="12" height="12" rx="2" fill={color} opacity="0.15" />
          <rect x="4" y="5" width="8" height="1.5" rx="0.75" fill={color} />
          <rect x="4" y="8" width="6" height="1.5" rx="0.75" fill={color} />
        </svg>
      );
    case 'epic':
      return (
        <svg {...commonProps}>
          <rect width="16" height="16" rx="2" fill={color} opacity="0.15" />
          <path d="M9 3L5 8.5H7.5L6.5 13L11 7.5H8.5L9 3Z" fill={color} />
        </svg>
      );
    case 'feature':
      return (
        <svg {...commonProps}>
          <rect width="16" height="16" rx="2" fill={color} opacity="0.15" />
          <path d="M8 3L9.5 6.5H13L10.5 8.5L11.5 12L8 10L4.5 12L5.5 8.5L3 6.5H6.5L8 3Z" fill={color} />
        </svg>
      );
    case 'story':
      return (
        <svg {...commonProps}>
          <rect x="3" y="2" width="10" height="12" rx="1.5" fill={color} opacity="0.15" />
          <rect x="5" y="5" width="6" height="1" rx="0.5" fill={color} />
          <rect x="5" y="7.5" width="6" height="1" rx="0.5" fill={color} />
          <rect x="5" y="10" width="4" height="1" rx="0.5" fill={color} />
        </svg>
      );
    case 'task':
      return (
        <svg {...commonProps}>
          <rect x="2" y="2" width="12" height="12" rx="2" fill={color} opacity="0.15" />
          <path d="M5 8L7 10L11 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'defect':
      return (
        <svg {...commonProps}>
          <circle cx="8" cy="8" r="6" fill={color} opacity="0.15" />
          <circle cx="8" cy="8" r="3" fill={color} opacity="0.4" />
          <circle cx="8" cy="8" r="1.5" fill={color} />
        </svg>
      );
    case 'incident':
      return (
        <svg {...commonProps}>
          <path d="M8 1.5L15 14H1L8 1.5Z" fill={color} opacity="0.15" />
          <path d="M8 5V9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="11" r="1" fill={color} />
        </svg>
      );
    case 'dependency':
      return (
        <svg {...commonProps}>
          <rect width="16" height="16" rx="2" fill={color} opacity="0.15" />
          <circle cx="8" cy="4" r="1.5" fill={color} />
          <circle cx="5" cy="12" r="1.5" fill={color} />
          <circle cx="11" cy="12" r="1.5" fill={color} />
          <path d="M8 5.5V8L5.5 10.5M8 8L10.5 10.5" stroke={color} strokeWidth="1.2" />
        </svg>
      );
    case 'risk':
      return (
        <svg {...commonProps}>
          <path d="M8 1.5L15 14H1L8 1.5Z" fill={color} opacity="0.15" />
          <path d="M8 1.5L15 14H1L8 1.5Z" stroke={color} strokeWidth="1" opacity="0.5" />
          <path d="M8 5V9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="11" r="1" fill={color} />
        </svg>
      );
    default:
      return (
        <svg {...commonProps}>
          <circle cx="8" cy="8" r="6" fill={color} opacity="0.15" />
          <circle cx="8" cy="8" r="3" fill={color} />
        </svg>
      );
  }
}

export default WorkItemIcon;
