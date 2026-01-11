import { cn } from "@/lib/utils";
import { Ban, AlertTriangle, AlertCircle, Info, Minus } from "lucide-react";

interface SeverityBadgeProps {
  severity: 'blocker' | 'critical' | 'major' | 'minor' | 'trivial';
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  // Catalyst V5 Design System compliant colors
  // Blocker uses solid red for highest visual severity
  const styles: Record<string, string> = {
    blocker: 'bg-red-600 text-white border border-red-700',
    critical: 'bg-red-100 text-red-800 border border-red-300',
    major: 'bg-orange-100 text-orange-800 border border-orange-300',
    minor: 'bg-amber-100 text-amber-800 border border-amber-300',
    trivial: 'bg-gray-100 text-gray-600 border border-gray-300'
  };
  
  const icons: Record<string, React.ReactNode> = {
    blocker: <Ban className="w-3 h-3 mr-1" />,
    critical: <AlertTriangle className="w-3 h-3 mr-1" />,
    major: <AlertCircle className="w-3 h-3 mr-1" />,
    minor: <Info className="w-3 h-3 mr-1" />,
    trivial: <Minus className="w-3 h-3 mr-1" />
  };
  
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
      styles[severity]
    )}>
      {icons[severity]}
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
}
