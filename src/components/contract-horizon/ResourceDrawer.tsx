/**
 * Resource Detail Drawer
 * Side panel with detailed resource contract information
 */

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContractResourceWithStatus } from '@/types/contract-horizon';
import { DEPARTMENT_COLORS } from '@/types/contract-horizon';

interface ResourceDrawerProps {
  resource: ContractResourceWithStatus | null;
  onClose: () => void;
}

export function ResourceDrawer({ resource, onClose }: ResourceDrawerProps) {
  if (!resource) return null;

  const colors = DEPARTMENT_COLORS[resource.department] || DEPARTMENT_COLORS.Delivery;
  const initials = resource.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  
  const statusGradient = 
    resource.status === 'critical' ? 'linear-gradient(90deg, #f87171, var(--ds-text-danger, #dc2626))' :
    resource.status === 'warning' ? 'linear-gradient(90deg, #fbbf24, var(--ds-text-warning, #d97706))' :
    'linear-gradient(90deg, #2dd4bf, #0d9488)';

  const statusColor = 
    resource.status === 'critical' ? 'var(--ds-text-danger, var(--ds-text-danger, #ef4444))' :
    resource.status === 'warning' ? 'var(--ds-text-warning, var(--ds-text-warning, #d97706))' :
    '#0d9488';

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] animate-in fade-in duration-300"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-[400px] max-w-[90vw] bg-card z-[1001] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-border flex gap-4 bg-muted/50">
          {/* Avatar */}
          <div 
            className="w-14 h-14 rounded-[14px] flex items-center justify-center text-[20px] font-extrabold text-white flex-shrink-0"
            style={{
              background: colors.gradient,
              boxShadow: `0 6px 20px ${colors.shadow}`
            }}
          >
            {initials}
          </div>
          
          {/* Info */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-[18px] font-extrabold text-foreground tracking-[-0.02em] mb-0.5">
              {resource.name}
            </div>
            <div className="text-[13px] text-muted-foreground font-medium">
              {resource.role}
            </div>
          </div>
          
          {/* Close */}
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-[10px] bg-card border border-border flex items-center justify-center self-start transition-colors hover:bg-muted"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Contract Status Section */}
          <div className="mb-7">
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-3">
              Contract Status
            </div>
            <div 
              className={cn(
                "relative p-5 rounded-[14px] border border-border bg-muted/50 overflow-hidden",
              )}
            >
              {/* Top accent */}
              <div 
                className="absolute top-0 left-0 right-0 h-1"
                style={{ background: statusGradient }}
              />
              
              {/* Progress Bar */}
              <div className="h-2 bg-card border border-border rounded overflow-hidden mb-3">
                <div 
                  className="h-full rounded"
                  style={{ 
                    width: `${resource.progress}%`,
                    background: statusGradient
                  }}
                />
              </div>
              
              {/* Dates */}
              <div className="flex justify-between text-[12px] text-muted-foreground font-medium mb-5 pb-5 border-b border-border">
                <span>{resource.contractStart}</span>
                <span>{resource.contractEnd}</span>
              </div>
              
              {/* Hero Stat */}
              <div className="text-center">
                <div 
                  className="text-[48px] font-extrabold tracking-[-0.04em] leading-none mb-1"
                  style={{ color: statusColor }}
                >
                  {resource.daysRemaining}
                </div>
                <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-[0.08em]">
                  days remaining
                </div>
              </div>
            </div>
          </div>
          
          {/* Details Section */}
          <div className="mb-7">
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-3">
              Details
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DetailBox label="Department" value={resource.department} />
              <DetailBox label="Vendor" value={resource.vendor} />
              <DetailBox label="Country" value={resource.country || 'Unknown'} />
              <DetailBox label="Location" value={resource.location || 'On-site'} />
            </div>
          </div>
          
          {/* Attributes Section */}
          <div>
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-3">
              Attributes
            </div>
            <div className="flex flex-wrap gap-2">
              <AttributePill 
                label={resource.department} 
                color={colors.text}
              />
              <AttributePill 
                label={resource.vendor} 
                color="#c2410c"
              />
              <AttributePill 
                label={resource.location || 'On-site'} 
                color="#0f766e"
              />
              <AttributePill 
                label={resource.country || 'Unknown'} 
                color="var(--ds-text-danger, var(--ds-text-danger, #dc2626))"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3.5 rounded-[10px] bg-muted/50 border border-border">
      <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-1">
        {label}
      </div>
      <div className="text-[14px] font-bold text-foreground">
        {value}
      </div>
    </div>
  );
}

function AttributePill({ label, color }: { label: string; color: string }) {
  return (
    <span 
      className="px-3 py-1.5 rounded-full text-[11px] font-semibold border"
      style={{
        background: `${color}10`,
        borderColor: `${color}40`,
        color
      }}
    >
      {label}
    </span>
  );
}
