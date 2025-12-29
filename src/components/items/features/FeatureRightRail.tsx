/**
 * FeatureRightRail - Editable right rail for Feature detail panel
 * All fields auto-save to database on change
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronUp, 
  ChevronDown, 
  Settings, 
  Calendar as CalendarIcon,
  X,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FeatureRightRailProps {
  featureId: string;
  featureData: any;
  onRefresh: () => void;
}

// Collapsible section component
function CollapsibleSection({ title, children, defaultOpen = true }: { 
  title: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border last:border-b-0">
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

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
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

const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical', className: 'bg-red-100 text-red-700' },
  { value: 'high', label: 'High', className: 'bg-amber-100 text-amber-700' },
  { value: 'medium', label: 'Medium', className: 'bg-slate-100 text-slate-600' },
  { value: 'low', label: 'Low', className: 'bg-gray-100 text-gray-600' },
];

const RISK_OPTIONS = [
  { value: 'critical', label: 'Critical', className: 'bg-red-100 text-red-700' },
  { value: 'high', label: 'High', className: 'bg-amber-100 text-amber-700' },
  { value: 'medium', label: 'Medium', className: 'bg-slate-100 text-slate-600' },
  { value: 'low', label: 'Low', className: 'bg-emerald-100 text-emerald-700' },
];

const ENVIRONMENT_OPTIONS = [
  { value: 'development', label: 'Development' },
  { value: 'staging', label: 'Staging' },
  { value: 'production', label: 'Production' },
];

export function FeatureRightRail({ featureId, featureData, onRefresh }: FeatureRightRailProps) {
  const queryClient = useQueryClient();
  const [labelInput, setLabelInput] = useState('');
  const [componentInput, setComponentInput] = useState('');

  // Fetch lookup data
  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id, name, is_default').order('name');
      return data || [];
    },
  });

  const { data: programs } = useQuery({
    queryKey: ['programs-list'],
    queryFn: async () => {
      const { data } = await supabase.from('programs').select('id, name').order('name');
      return data || [];
    },
  });

  const { data: epics } = useQuery({
    queryKey: ['epics-list'],
    queryFn: async () => {
      const { data } = await supabase.from('epics').select('id, epic_key, name').order('epic_key');
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['profiles-list'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email').order('full_name');
      return data || [];
    },
  });

  const { data: departments } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('id, name').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id, name').order('name');
      return data || [];
    },
  });

  const { data: businessOwners } = useQuery({
    queryKey: ['business-owners-list'],
    queryFn: async () => {
      const { data } = await supabase.from('business_owners').select('id, name').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const { data: releases } = useQuery({
    queryKey: ['releases-list'],
    queryFn: async () => {
      const { data } = await supabase.from('releases').select('id, name, status').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: changeNumbers } = useQuery({
    queryKey: ['change-numbers-list'],
    queryFn: async () => {
      const { data } = await supabase.from('change_numbers').select('id, number, description').order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase
        .from('features')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', featureId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-detail-panel', featureId] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      onRefresh();
      toast.success('Saved');
    },
    onError: (error: any) => {
      toast.error('Failed to save', { description: error.message });
    },
  });

  const handleUpdate = (field: string, value: any) => {
    updateMutation.mutate({ [field]: value });
  };

  const handleAddLabel = () => {
    if (!labelInput.trim()) return;
    const currentLabels = featureData?.labels || [];
    if (!currentLabels.includes(labelInput.trim())) {
      handleUpdate('labels', [...currentLabels, labelInput.trim()]);
    }
    setLabelInput('');
  };

  const handleRemoveLabel = (label: string) => {
    const currentLabels = featureData?.labels || [];
    handleUpdate('labels', currentLabels.filter((l: string) => l !== label));
  };

  const handleAddComponent = () => {
    if (!componentInput.trim()) return;
    const currentComponents = featureData?.components || [];
    if (!currentComponents.includes(componentInput.trim())) {
      handleUpdate('components', [...currentComponents, componentInput.trim()]);
    }
    setComponentInput('');
  };

  const handleRemoveComponent = (component: string) => {
    const currentComponents = featureData?.components || [];
    handleUpdate('components', currentComponents.filter((c: string) => c !== component));
  };

  return (
    <div className="w-[280px] lg:w-[300px] border-l bg-card flex flex-col hidden md:flex">
      {/* Details Section */}
      <CollapsibleSection title="Details">
        <FieldRow label="Assignee">
          <Select 
            value={featureData?.assignee_id || featureData?.owner_id || ''} 
            onValueChange={(val) => handleUpdate('assignee_id', val || null)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select assignee">
                {featureData?.owner ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-[10px] font-medium">
                      {getInitials(featureData.owner.full_name)}
                    </div>
                    <span className="truncate">{featureData.owner.full_name}</span>
                  </div>
                ) : 'Select assignee'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Unassigned</SelectItem>
              {profiles?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name || p.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Project">
          <Select 
            value={featureData?.project_id || ''} 
            onValueChange={(val) => handleUpdate('project_id', val || null)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {projects?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.is_default ? `${p.name} (Default)` : p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Program">
          <Select 
            value={featureData?.program_id || ''} 
            onValueChange={(val) => handleUpdate('program_id', val || null)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Not assigned</SelectItem>
              {programs?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Parent Epic">
          <Select 
            value={featureData?.epic_id || ''} 
            onValueChange={(val) => handleUpdate('epic_id', val || null)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select epic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {epics?.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.epic_key} - {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Product">
          <Select 
            value={featureData?.product_id || ''} 
            onValueChange={(val) => handleUpdate('product_id', val || null)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Not assigned</SelectItem>
              {products?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Department">
          <Select 
            value={featureData?.department_id || ''} 
            onValueChange={(val) => handleUpdate('department_id', val || null)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Not assigned</SelectItem>
              {departments?.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Business Owner">
          <Select 
            value={featureData?.business_owner_id || ''} 
            onValueChange={(val) => handleUpdate('business_owner_id', val || null)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select business owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Not assigned</SelectItem>
              {businessOwners?.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>
      </CollapsibleSection>

      {/* Planning Section */}
      <CollapsibleSection title="Planning">
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Start Date">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal h-8">
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {featureData?.planned_start_date 
                    ? format(new Date(featureData.planned_start_date), 'MMM d, yyyy')
                    : 'Set date'
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={featureData?.planned_start_date ? new Date(featureData.planned_start_date) : undefined}
                  onSelect={(date) => handleUpdate('planned_start_date', date ? format(date, 'yyyy-MM-dd') : null)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </FieldRow>

          <FieldRow label="Target Date">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal h-8">
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {featureData?.planned_end_date 
                    ? format(new Date(featureData.planned_end_date), 'MMM d, yyyy')
                    : 'Set date'
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={featureData?.planned_end_date ? new Date(featureData.planned_end_date) : undefined}
                  onSelect={(date) => handleUpdate('planned_end_date', date ? format(date, 'yyyy-MM-dd') : null)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </FieldRow>
        </div>

        <FieldRow label="Release">
          <Select 
            value={featureData?.release_id || ''} 
            onValueChange={(val) => handleUpdate('release_id', val || null)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select release" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Not assigned</SelectItem>
              {releases?.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Change Number">
          <Select 
            value={featureData?.change_number_id || ''} 
            onValueChange={(val) => handleUpdate('change_number_id', val || null)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select change number" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Not assigned</SelectItem>
              {changeNumbers?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.number} {c.description ? `- ${c.description}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Priority">
            <Select 
              value={featureData?.priority || ''} 
              onValueChange={(val) => handleUpdate('priority', val || null)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Set priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {PRIORITY_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label="Risk">
            <Select 
              value={featureData?.risk || ''} 
              onValueChange={(val) => handleUpdate('risk', val || null)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Set risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {RISK_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
        </div>
      </CollapsibleSection>

      {/* Classification Section */}
      <CollapsibleSection title="Classification">
        <FieldRow label="Labels">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {(featureData?.labels || []).map((label: string) => (
                <Badge key={label} variant="secondary" className="text-xs">
                  {label}
                  <button onClick={() => handleRemoveLabel(label)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {(!featureData?.labels || featureData.labels.length === 0) && (
                <span className="text-muted-foreground text-xs">None</span>
              )}
            </div>
            <div className="flex gap-1">
              <Input
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddLabel()}
                placeholder="Add label..."
                className="h-7 text-xs"
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleAddLabel}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </FieldRow>

        <FieldRow label="Components / Services">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {(featureData?.components || []).map((comp: string) => (
                <Badge key={comp} variant="outline" className="text-xs">
                  {comp}
                  <button onClick={() => handleRemoveComponent(comp)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {(!featureData?.components || featureData.components.length === 0) && (
                <span className="text-muted-foreground text-xs">None</span>
              )}
            </div>
            <div className="flex gap-1">
              <Input
                value={componentInput}
                onChange={(e) => setComponentInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComponent()}
                placeholder="Add component..."
                className="h-7 text-xs"
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleAddComponent}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </FieldRow>

        <FieldRow label="Environment">
          <Select 
            value={featureData?.environment || ''} 
            onValueChange={(val) => handleUpdate('environment', val || null)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Not set</SelectItem>
              {ENVIRONMENT_OPTIONS.map((e) => (
                <SelectItem key={e.value} value={e.value}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
