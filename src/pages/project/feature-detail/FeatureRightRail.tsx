/**
 * FeatureRightRail — Collapsible right sidebar for Feature detail page
 * 
 * Sections:
 * - Details (Owner, Project, Program, Parent Epic, Product, Department, Business Owner)
 * - Planning (Start Date, Target Date, Release, Priority, Risk)
 * - Classification (Labels, Components, Environment)
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Settings, User, Calendar, Zap, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { useProjects } from '@/hooks/useProjects';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FeatureRightRailProps {
  feature: {
    id: string;
    owner_id: string | null;
    epic_id: string;
    project_id?: string | null;
    planned_start_date: string | null;
    planned_end_date: string | null;
    health: string | null;
    owner?: { id: string; full_name: string } | null;
    epic?: { id: string; epic_key: string; name: string; primary_program_id?: string | null } | null;
    project?: { id: string; name: string } | null;
    change_number?: { id: string; number: string; description?: string | null } | null;
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

/**
 * PLACEHOLDER DATA - Fields not yet connected to database
 * TODO: Connect these to actual database relationships:
 * - Program: from feature.epic.primary_program_id → programs table
 * - Product: from feature.product_id → products table (needs schema update)
 * - Department: from feature owner's department
 * - Business Owner: from feature.business_owner_id → profiles table
 * - Labels, Components: from feature_labels, feature_components tables (needs creation)
 */
const PLACEHOLDER_FIELDS = {
  program: null as string | null,
  product: null as string | null,
  department: null as string | null,
  businessOwner: null as { name: string; initials: string } | null,
  release: null as string | null,
  priority: null as string | null,
  risk: null as string | null,
  labels: [] as string[],
  components: [] as string[],
  environment: 'Production',
};

export function FeatureRightRail({ feature, collapsed, onToggleCollapse, onUpdate }: FeatureRightRailProps) {
  const { data: projects } = useProjects();
  const queryClient = useQueryClient();
  
  // Auto-save project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from('features')
        .update({ project_id: projectId } as any)
        .eq('id', feature.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-detail'] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast.success('Project updated');
    },
    onError: () => {
      toast.error('Failed to update project');
    },
  });

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
        <FieldRow label="Assignee">
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

        <FieldRow label="Project">
          <Select 
            value={feature.project_id || ''} 
            onValueChange={(val) => updateProjectMutation.mutate(val)}
            disabled={updateProjectMutation.isPending}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.is_default ? `${project.name} (Default)` : project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Program">
          {PLACEHOLDER_FIELDS.program ? (
            <span className="text-[#2563eb] hover:text-[#1d4ed8] cursor-pointer hover:underline transition-colors font-medium">
              {PLACEHOLDER_FIELDS.program}
            </span>
          ) : (
            <span className="text-muted-foreground">Not assigned</span>
          )}
        </FieldRow>

        <FieldRow label="Parent Epic">
          {feature.epic ? (
            <span className="text-[#2563eb] hover:text-[#1d4ed8] cursor-pointer hover:underline transition-colors font-medium">
              {feature.epic.epic_key} {feature.epic.name}
            </span>
          ) : (
            <span className="text-muted-foreground">None</span>
          )}
        </FieldRow>

        <FieldRow label="Product">
          <span>{PLACEHOLDER_FIELDS.product || <span className="text-muted-foreground">Not assigned</span>}</span>
        </FieldRow>

        <FieldRow label="Department">
          <span>{PLACEHOLDER_FIELDS.department || <span className="text-muted-foreground">Not assigned</span>}</span>
        </FieldRow>

        <FieldRow label="Business Owner">
          {PLACEHOLDER_FIELDS.businessOwner ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-medium">
                {PLACEHOLDER_FIELDS.businessOwner.initials}
              </div>
              <span>{PLACEHOLDER_FIELDS.businessOwner.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Not assigned</span>
          )}
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
          {PLACEHOLDER_FIELDS.release ? (
            <span className="text-gold-link hover:text-gold-link-hover cursor-pointer hover:underline transition-colors font-mono text-xs font-medium">
              {PLACEHOLDER_FIELDS.release}
            </span>
          ) : (
            <span className="text-muted-foreground">Not assigned</span>
          )}
        </FieldRow>

        <FieldRow label="Change Number">
          {feature.change_number ? (
            <span className="font-mono text-xs bg-muted px-2 py-1 rounded inline-block">
              {feature.change_number.number}
            </span>
          ) : (
            <span className="text-muted-foreground">Not assigned</span>
          )}
        </FieldRow>

        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Priority">
            {PLACEHOLDER_FIELDS.priority ? (
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {PLACEHOLDER_FIELDS.priority}
              </Badge>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </FieldRow>

          <FieldRow label="Risk">
            {PLACEHOLDER_FIELDS.risk ? (
              <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                {PLACEHOLDER_FIELDS.risk}
              </Badge>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </FieldRow>
        </div>
      </CollapsibleSection>

      {/* Classification Section */}
      <CollapsibleSection title="Classification">
        <FieldRow label="Labels">
          <div className="flex flex-wrap gap-1">
            {PLACEHOLDER_FIELDS.labels.length > 0 ? (
              PLACEHOLDER_FIELDS.labels.map((label) => (
                <Badge key={label} variant="outline" className="text-xs">
                  {label}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">None</span>
            )}
          </div>
        </FieldRow>

        <FieldRow label="Components / Services">
          <div className="flex flex-wrap gap-1">
            {PLACEHOLDER_FIELDS.components.length > 0 ? (
              PLACEHOLDER_FIELDS.components.map((component) => (
                <Badge key={component} variant="outline" className="text-xs">
                  {component}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">None</span>
            )}
          </div>
        </FieldRow>

        <FieldRow label="Environment">
          <span>{PLACEHOLDER_FIELDS.environment}</span>
        </FieldRow>
      </CollapsibleSection>

      {/* Configure Fields Button */}
      <div className="mt-auto p-4 border-t">
        <Button variant="ghost" size="sm" className="w-full justify-center">
          <Settings className="h-4 w-4 mr-2" />
          Configure Fields
        </Button>
      </div>
    </div>
  );
}
