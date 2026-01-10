/**
 * Placeholder page for Release & Test Management routes that are under development
 */

import { useLocation } from 'react-router-dom';
import { 
  Package, 
  Calendar, 
  GitCompare, 
  FileCheck, 
  Globe, 
  Play, 
  Sparkles, 
  PieChart, 
  ShieldCheck, 
  Network, 
  Bug, 
  Gauge,
  UserCheck,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const routeConfig: Record<string, { title: string; icon: any; description: string }> = {
  '/releases/dashboard': { 
    title: 'Release Dashboard', 
    icon: Gauge, 
    description: 'View detailed metrics and status for individual releases' 
  },
  '/releases/my-scope': { 
    title: 'My Test Scope', 
    icon: UserCheck, 
    description: 'View and manage test cases assigned to you' 
  },
  '/releases/all': { 
    title: 'All Releases', 
    icon: Package, 
    description: 'Browse and manage all releases in the system' 
  },
  '/releases/calendar': { 
    title: 'Calendar View', 
    icon: Calendar, 
    description: 'View releases on a calendar timeline' 
  },
  '/releases/compare': { 
    title: 'Release Compare', 
    icon: GitCompare, 
    description: 'Compare metrics and content between releases' 
  },
  '/releases/test-cases': { 
    title: 'Test Cases', 
    icon: FileCheck, 
    description: 'Manage test case library and specifications' 
  },
  '/releases/test-cycles': { 
    title: 'Test Cycles', 
    icon: Globe, 
    description: 'Create and manage test execution cycles' 
  },
  '/releases/execution': { 
    title: 'Test Execution', 
    icon: Play, 
    description: 'Execute tests and record results' 
  },
  '/releases/ask-ai': { 
    title: 'Ask AI', 
    icon: Sparkles, 
    description: 'Get AI-powered insights and recommendations' 
  },
  '/releases/coverage': { 
    title: 'Coverage Reports', 
    icon: PieChart, 
    description: 'View test coverage analysis and reports' 
  },
  '/releases/quality-gates': { 
    title: 'Quality Gates', 
    icon: ShieldCheck, 
    description: 'Configure and monitor release quality gates' 
  },
  '/releases/rtm': { 
    title: 'Requirements Traceability Matrix', 
    icon: Network, 
    description: 'Track requirements to test coverage mapping' 
  },
  '/releases/defects': { 
    title: 'Defects', 
    icon: Bug, 
    description: 'Track and manage defects found during testing' 
  },
};

export default function ReleasesPlaceholderPage() {
  const location = useLocation();
  const config = routeConfig[location.pathname] || { 
    title: 'Coming Soon', 
    icon: Clock, 
    description: 'This screen is under development' 
  };
  
  const Icon = config.icon;

  return (
    <div className="flex-1 flex flex-col">
      {/* Page Header */}
      <div className="bg-white border-b border-border px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <span>Releases</span>
          <span>/</span>
          <span className="text-foreground font-medium">{config.title}</span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">{config.title}</h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div 
            className={cn(
              "mx-auto mb-6 w-20 h-20 rounded-2xl flex items-center justify-center",
              "bg-primary/10"
            )}
          >
            <Icon className="w-10 h-10 text-primary" />
          </div>
          
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Coming Soon
          </h2>
          
          <p className="text-muted-foreground mb-6">
            {config.description}
          </p>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
            <Clock className="w-4 h-4" />
            <span>Under Development</span>
          </div>
        </div>
      </div>
    </div>
  );
}
