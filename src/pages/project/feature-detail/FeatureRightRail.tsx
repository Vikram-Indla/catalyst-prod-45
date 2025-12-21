/**
 * FeatureRightRail — Collapsible right sidebar for Feature detail page
 * 
 * Sections:
 * - Details (Owner, Program, Parent Epic, Product, Department, Business Owner)
 * - Planning (Start Date, Target Date, Release, Priority, Risk)
 * - Classification (Labels, Components, Environment)
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Settings, User, Calendar, Zap, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface FeatureRightRailProps {
  feature: {
    id: string;
    owner_id: string | null;
    epic_id: string;
    planned_start_date: string | null;
    planned_end_date: string | null;
    health: string | null;
    owner?: { id: string; full_name: string } | null;
    epic?: { id: string; epic_key: string; name: string; primary_program_id?: string | null } | null;
    project?: { id: string; name: string } | null;
  };
  collapsed: boolean;
  onToggleCollapse: () => void;
  onUpdate: (data: any) => void;
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, children, defaultOpen = true }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
          {title}
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

interface FieldRowProps {
  label: string;
  children: React.ReactNode;
}

function FieldRow({ label, children }: FieldRowProps) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      <div className="text-sm text-foreground">
        {children}
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// Mock data for fields not in DB
const MOCK_DATA = {
  program: 'MIM Digital Transformation 2026',
  product: 'Investor Portal',
  department: 'License Dept',
  businessOwner: { name: 'Abu Badr', initials: 'AB' },
  release: 'REL-2026-Q1',
  priority: 'High',
  risk: 'Medium',
  labels: ['compliance', 'investor-journey', 'q1-2026'],
  components: ['rule-engine', 'dashboard', 'audit-service'],
  environment: 'Production',
};

export function FeatureRightRail({ feature, collapsed, onToggleCollapse, onUpdate }: FeatureRightRailProps) {
  if (collapsed) {
    return (
      <div className="w-10 border-l flex flex-col items-center py-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggleCollapse}
          className="mb-2"
        >
          <ChevronDown className="h-4 w-4 rotate-90" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-[300px] border-l bg-card flex flex-col">
      {/* Details Section */}
      <CollapsibleSection title="Details">
        <FieldRow label="Owner">
          {feature.owner ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-medium">
                {getInitials(feature.owner.full_name)}
              </div>
              <span>{feature.owner.full_name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
          )}
        </FieldRow>

        <FieldRow label="Program">
          <span className="text-gold-link hover:text-gold-link-hover cursor-pointer hover:underline transition-colors font-medium">
            {MOCK_DATA.program}
          </span>
        </FieldRow>

        <FieldRow label="Parent Epic">
          {feature.epic ? (
            <span className="text-gold-link hover:text-gold-link-hover cursor-pointer hover:underline transition-colors font-medium">
              {feature.epic.epic_key} {feature.epic.name}
            </span>
          ) : (
            <span className="text-muted-foreground">None</span>
          )}
        </FieldRow>

        <FieldRow label="Product">
          <span>{MOCK_DATA.product}</span>
        </FieldRow>

        <FieldRow label="Department">
          <span>{MOCK_DATA.department}</span>
        </FieldRow>

        <FieldRow label="Business Owner">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-medium">
              {MOCK_DATA.businessOwner.initials}
            </div>
            <span>{MOCK_DATA.businessOwner.name}</span>
          </div>
        </FieldRow>
      </CollapsibleSection>

      {/* Planning Section */}
      <CollapsibleSection title="Planning">
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Start Date">
            <span>
              {feature.planned_start_date 
                ? format(new Date(feature.planned_start_date), 'MMM d, yyyy')
                : 'Not set'
              }
            </span>
          </FieldRow>

          <FieldRow label="Target Date">
            <span>
              {feature.planned_end_date 
                ? format(new Date(feature.planned_end_date), 'MMM d, yyyy')
                : 'Not set'
              }
            </span>
          </FieldRow>
        </div>

        <FieldRow label="Release">
          <span className="text-gold-link hover:text-gold-link-hover cursor-pointer hover:underline transition-colors font-mono text-xs font-medium">
            {MOCK_DATA.release}
          </span>
        </FieldRow>

        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Priority">
            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {MOCK_DATA.priority}
            </Badge>
          </FieldRow>

          <FieldRow label="Risk">
            <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              {MOCK_DATA.risk}
            </Badge>
          </FieldRow>
        </div>
      </CollapsibleSection>

      {/* Classification Section */}
      <CollapsibleSection title="Classification">
        <FieldRow label="Labels">
          <div className="flex flex-wrap gap-1">
            {MOCK_DATA.labels.map((label) => (
              <Badge key={label} variant="outline" className="text-xs">
                {label}
              </Badge>
            ))}
          </div>
        </FieldRow>

        <FieldRow label="Components / Services">
          <div className="flex flex-wrap gap-1">
            {MOCK_DATA.components.map((component) => (
              <Badge key={component} variant="outline" className="text-xs">
                {component}
              </Badge>
            ))}
          </div>
        </FieldRow>

        <FieldRow label="Environment">
          <span>{MOCK_DATA.environment}</span>
        </FieldRow>
      </CollapsibleSection>

      {/* Configure Fields - Deferred */}
      {/* <div className="mt-auto p-4 border-t">
        <Button variant="ghost" size="sm" className="w-full justify-center">
          <Settings className="h-4 w-4 mr-2" />
          Configure Fields
        </Button>
      </div> */}
    </div>
  );
}
