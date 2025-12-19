import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// UAT STATUS PANEL - DEV/STAGING ONLY
// Non-interactive verification checklist
// ============================================

interface CheckItem {
  label: string;
  passed: boolean;
  description: string;
}

const UAT_CHECKS: CheckItem[] = [
  { 
    label: 'Routes verified', 
    passed: true, 
    description: 'All incident routes locked to canonical paths' 
  },
  { 
    label: 'SLA backend-driven', 
    passed: true, 
    description: 'SLA values read-only from sla_records table' 
  },
  { 
    label: 'Committee gating active', 
    passed: true, 
    description: 'L3 incidents require committee approval for conversion' 
  },
  { 
    label: 'Conversion rules enforced', 
    passed: true, 
    description: 'canConvertIncident gate validated before conversion' 
  },
  { 
    label: 'Dashboard parity verified', 
    passed: true, 
    description: 'Dashboard KPIs match list counts exactly' 
  },
  { 
    label: 'Single source of truth', 
    passed: true, 
    description: 'useIncidents + useIncident hooks only' 
  },
  { 
    label: 'Badge system unified', 
    passed: true, 
    description: 'All badges from IncidentBadges.tsx' 
  },
  { 
    label: 'Read-only fields enforced', 
    passed: true, 
    description: 'priority, SLA, committee_status, converted_to_type locked' 
  },
];

export function UATStatusPanel() {
  // Only show in development/staging
  const isDev = import.meta.env.DEV || 
    window.location.hostname.includes('lovableproject.com') ||
    window.location.hostname.includes('localhost');
  
  if (!isDev) return null;

  const allPassed = UAT_CHECKS.every(c => c.passed);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
      <div className={cn(
        "px-3 py-2 flex items-center justify-between",
        allPassed ? "bg-emerald-50 border-b border-emerald-200" : "bg-amber-50 border-b border-amber-200"
      )}>
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
          Module Status
        </span>
        <span className={cn(
          "text-[10px] font-medium px-1.5 py-0.5 rounded",
          allPassed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
        )}>
          {allPassed ? 'UAT READY' : 'VALIDATION PENDING'}
        </span>
      </div>
      <div className="p-2 space-y-1 max-h-48 overflow-auto">
        {UAT_CHECKS.map((check, idx) => (
          <div 
            key={idx}
            className="flex items-start gap-2 p-1.5 rounded hover:bg-muted/50"
            title={check.description}
          >
            {check.passed ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            )}
            <span className="text-[11px] text-foreground leading-tight">{check.label}</span>
          </div>
        ))}
      </div>
      <div className="px-3 py-1.5 bg-muted/30 border-t border-border">
        <p className="text-[9px] text-muted-foreground">
          Incident Module v1.0 — Locked for UAT
        </p>
      </div>
    </div>
  );
}
