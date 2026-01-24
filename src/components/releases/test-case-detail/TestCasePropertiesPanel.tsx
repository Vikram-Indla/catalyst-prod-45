/**
 * Test Case Properties Panel Component — Fully wired to DB with correct query invalidation
 * Auto-versions on every property change
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  Folder, 
  CircleDot, 
  Flag, 
  Tag, 
  User, 
  Clock, 
  Pencil,
  Plus,
  AlertTriangle,
  ArrowUp,
  Minus,
  ArrowDown,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTestCaseLabels, useAddTestCaseLabel, useRemoveTestCaseLabel, useCreateLabel } from '@/hooks/test-management/useTestCaseTags';
import { useAutoVersioning } from '@/hooks/test-management/useAutoVersioning';
import { useSelectableReleases, useUpdateTestCaseRelease } from '@/hooks/test-management/useTestCaseRelease';
import type { TestCaseDetailData } from '@/hooks/test-management/useTestCases';

// Priority ID mapping from tm_case_priorities table
const PRIORITY_ID_MAP: Record<string, string> = {
  'Critical': '00000000-0000-0000-0001-000000000001',
  'High': '00000000-0000-0000-0001-000000000002',
  'Medium': '00000000-0000-0000-0001-000000000003',
  'Low': '00000000-0000-0000-0001-000000000004',
};

// Type ID mapping from tm_case_types table
const TYPE_ID_MAP: Record<string, string> = {
  'Functional': '00000000-0000-0000-0002-000000000001',
  'Regression': '00000000-0000-0000-0002-000000000002',
  'Smoke': '00000000-0000-0000-0002-000000000003',
  'Integration': '00000000-0000-0000-0002-000000000004',
  'End-to-End': '00000000-0000-0000-0002-000000000005',
  'Performance': '00000000-0000-0000-0002-000000000006',
  'Security': '00000000-0000-0000-0002-000000000007',
  'Usability': '00000000-0000-0000-0002-000000000008',
};

// Status mapping (status is an enum in DB)
const STATUS_TO_DB: Record<string, string> = {
  'DRAFT': 'draft',
  'REVIEW': 'ready',
  'APPROVED': 'approved',
  'DEPRECATED': 'deprecated',
};

interface TestCasePropertiesPanelProps {
  testCase: TestCaseDetailData;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  'DRAFT': { label: 'Draft', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  'REVIEW': { label: 'Ready', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  'APPROVED': { label: 'Approved', className: 'bg-green-50 text-green-700 border-green-200' },
  'DEPRECATED': { label: 'Deprecated', className: 'bg-red-50 text-red-600 border-red-200' },
};

const priorityConfig: Record<string, { label: string; icon: typeof AlertTriangle; className: string }> = {
  'Critical': { label: 'Critical', icon: AlertTriangle, className: 'text-red-600' },
  'High': { label: 'High', icon: ArrowUp, className: 'text-orange-600' },
  'Medium': { label: 'Medium', icon: Minus, className: 'text-gray-600' },
  'Low': { label: 'Low', icon: ArrowDown, className: 'text-blue-600' },
};

const typeConfig: Record<string, { className: string }> = {
  'Functional': { className: 'bg-blue-50 text-blue-700 border-blue-200' },
  'Regression': { className: 'bg-purple-50 text-purple-700 border-purple-200' },
  'Smoke': { className: 'bg-amber-50 text-amber-700 border-amber-200' },
  'Integration': { className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  'End-to-End': { className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  'Performance': { className: 'bg-pink-50 text-pink-700 border-pink-200' },
  'Security': { className: 'bg-red-50 text-red-700 border-red-200' },
  'Usability': { className: 'bg-teal-50 text-teal-700 border-teal-200' },
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function TestCasePropertiesPanel({ testCase }: TestCasePropertiesPanelProps) {
  const queryClient = useQueryClient();
  const { createVersion } = useAutoVersioning();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');
  
  // Loading states for each field
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);
  const [isUpdatingType, setIsUpdatingType] = useState(false);
  const [isUpdatingAssignee, setIsUpdatingAssignee] = useState(false);
  const [isUpdatingRelease, setIsUpdatingRelease] = useState(false);

  // Tags from DB
  const { data: dbLabels = [] } = useTestCaseLabels(testCase.id);
  const addLabelMutation = useAddTestCaseLabel();
  const removeLabelMutation = useRemoveTestCaseLabel();
  const createLabelMutation = useCreateLabel();

  // Releases
  const { data: selectableReleases = [] } = useSelectableReleases();
  const updateReleaseMutation = useUpdateTestCaseRelease();

  // Team members for assignee picker
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; full_name: string; avatar_url?: string }>>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Fetch team members when assignee editing starts
  useEffect(() => {
    if (editingField === 'assignee' && teamMembers.length === 0) {
      setIsLoadingMembers(true);
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name')
        .limit(50)
        .then(({ data }) => {
          setTeamMembers(data || []);
          setIsLoadingMembers(false);
        });
    }
  }, [editingField, teamMembers.length]);

  // Derived values from DB data
  const statusKey = testCase.status || 'DRAFT';
  const status = statusConfig[statusKey] || statusConfig['DRAFT'];

  const priorityName = testCase.priority?.name || 'Medium';
  const priority = priorityConfig[priorityName] || priorityConfig['Medium'];
  const PriorityIcon = priority.icon;

  const typeName = testCase.type?.name || 'Functional';
  const type = typeConfig[typeName] || typeConfig['Functional'];

  // Release display
  const releaseLabel = testCase.release 
    ? (testCase.release.name || 'Unassigned')
    : 'Unassigned';

  // Folder display
  const folderPath = testCase.folder?.path || testCase.folder?.name || '—';

  // Assignee
  const assigneeName = testCase.assigned_user?.full_name || 'Unassigned';
  const assigneeAvatar = testCase.assigned_user?.avatar_url;

  // Estimated duration
  const estimatedMinutes = testCase.estimated_duration_minutes;
  const estimatedTime = estimatedMinutes 
    ? `${estimatedMinutes} minutes`
    : testCase.steps?.length 
      ? `${Math.ceil((testCase.steps.length * 30) / 60)} minutes`
      : '—';

  // Created / Updated
  const createdByName = testCase.created_by_profile?.full_name || 'Unknown';
  const createdAt = testCase.created_at 
    ? format(new Date(testCase.created_at), 'MMM d, yyyy')
    : '—';
  const updatedAt = testCase.updated_at 
    ? formatDistanceToNow(new Date(testCase.updated_at), { addSuffix: true })
    : '—';

  // Invalidate both detail and list queries with CORRECT keys
  const invalidateQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ['tm-case', testCase.id] });
    await queryClient.invalidateQueries({ queryKey: ['tm-cases'] });
  };

  const handleStatusChange = async (value: string) => {
    const dbStatus = STATUS_TO_DB[value] as 'draft' | 'ready' | 'approved' | 'deprecated';
    if (!dbStatus) {
      toast.error('Invalid status value');
      return;
    }

    setIsUpdatingStatus(true);
    setEditingField(null);

    try {
      const { error } = await supabase
        .from('tm_test_cases')
        .update({ status: dbStatus })
        .eq('id', testCase.id);

      if (error) throw error;

      // Create version snapshot after successful update
      await createVersion({ testCaseId: testCase.id, changeSummary: `Status changed to ${statusConfig[value]?.label || value}` });

      await invalidateQueries();
      toast.success(`Status updated to ${statusConfig[value]?.label || value}`);
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePriorityChange = async (value: string) => {
    const priorityId = PRIORITY_ID_MAP[value];
    
    if (!priorityId) {
      toast.error('Invalid priority value');
      return;
    }

    setIsUpdatingPriority(true);
    setEditingField(null);

    try {
      const { error } = await supabase
        .from('tm_test_cases')
        .update({ priority_id: priorityId })
        .eq('id', testCase.id);

      if (error) throw error;

      // Create version snapshot after successful update
      await createVersion({ testCaseId: testCase.id, changeSummary: `Priority changed to ${value}` });

      await invalidateQueries();
      toast.success(`Priority updated to ${value}`);
    } catch (error) {
      console.error('Failed to update priority:', error);
      toast.error('Failed to update priority');
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  const handleTypeChange = async (value: string) => {
    const typeId = TYPE_ID_MAP[value];
    
    if (!typeId) {
      toast.error('Invalid type value');
      return;
    }

    setIsUpdatingType(true);
    setEditingField(null);

    try {
      const { error } = await supabase
        .from('tm_test_cases')
        .update({ case_type_id: typeId })
        .eq('id', testCase.id);

      if (error) throw error;

      // Create version snapshot after successful update
      await createVersion({ testCaseId: testCase.id, changeSummary: `Type changed to ${value}` });

      await invalidateQueries();
      toast.success(`Type updated to ${value}`);
    } catch (error) {
      console.error('Failed to update type:', error);
      toast.error('Failed to update type');
    } finally {
      setIsUpdatingType(false);
    }
  };

  const handleAssigneeChange = async (userId: string) => {
    setIsUpdatingAssignee(true);
    setEditingField(null);

    try {
      const { error } = await supabase
        .from('tm_test_cases')
        .update({ assigned_to: userId })
        .eq('id', testCase.id);

      if (error) throw error;

      // Create version snapshot after successful update
      const selectedMember = teamMembers.find(m => m.id === userId);
      await createVersion({ testCaseId: testCase.id, changeSummary: `Assignee changed to ${selectedMember?.full_name || 'user'}` });

      await invalidateQueries();
      toast.success('Assignee updated');
    } catch (error) {
      console.error('Failed to update assignee:', error);
      toast.error('Failed to update assignee');
    } finally {
      setIsUpdatingAssignee(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim() || !testCase.project_id) return;
    
    try {
      await createLabelMutation.mutateAsync({
        projectId: testCase.project_id,
        name: newTag.trim(),
        testCaseId: testCase.id,
      });
      setNewTag('');
      setIsAddingTag(false);
    } catch (error) {
      toast.error('Failed to add tag');
    }
  };

  const handleRemoveTag = async (labelId: string) => {
    try {
      await removeLabelMutation.mutateAsync({
        testCaseId: testCase.id,
        labelId,
      });
    } catch (error) {
      toast.error('Failed to remove tag');
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 sticky top-6">
      <h3 className="font-semibold text-foreground mb-4">Properties</h3>

      <div className="space-y-4">
        {/* Release - Editable */}
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="w-4 h-4" />
            <span>Release</span>
          </div>
          {isUpdatingRelease ? (
            <div className="flex items-center gap-1">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Updating...</span>
            </div>
          ) : editingField === 'release' ? (
            <Select
              value={testCase.release?.id || 'unassigned'}
              onValueChange={async (value) => {
                setIsUpdatingRelease(true);
                setEditingField(null);
                try {
                  await updateReleaseMutation.mutateAsync({
                    testCaseId: testCase.id,
                    projectId: testCase.project_id,
                    releaseId: value === 'unassigned' ? null : value,
                  });
                  await createVersion({ 
                    testCaseId: testCase.id, 
                    changeSummary: value === 'unassigned' ? 'Release cleared' : `Release changed` 
                  });
                  await invalidateQueries();
                } catch (error) {
                  console.error('Failed to update release:', error);
                } finally {
                  setIsUpdatingRelease(false);
                }
              }}
            >
              <SelectTrigger className="w-44 h-7">
                <SelectValue placeholder="Select release..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">
                  <span className="text-muted-foreground">Unassigned</span>
                </SelectItem>
                {selectableReleases.map((release) => (
                  <SelectItem key={release.id} value={release.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{release.name}</span>
                      {release.status && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                          {release.status}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div 
              className="flex items-center gap-1 cursor-pointer" 
              onClick={() => setEditingField('release')}
            >
              {testCase.release?.id ? (
                <Link 
                  to={`/releases/all/${testCase.release.id}`} 
                  className="text-sm text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {releaseLabel}
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">{releaseLabel}</span>
              )}
              <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>

        {/* Folder */}
        <PropertyField
          label="Folder"
          icon={Folder}
          value={folderPath}
        />

        {/* Status */}
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleDot className="w-4 h-4" />
            <span>Status</span>
          </div>
          {isUpdatingStatus ? (
            <div className="flex items-center gap-1">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Updating...</span>
            </div>
          ) : editingField === 'status' ? (
            <Select value={statusKey} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-32 h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="REVIEW">Ready</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="DEPRECATED">Deprecated</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-1 cursor-pointer" onClick={() => setEditingField('status')}>
              <Badge variant="outline" className={cn('text-xs', status.className)}>
                {status.label}
              </Badge>
              <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>

        {/* Priority */}
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Flag className="w-4 h-4" />
            <span>Priority</span>
          </div>
          {isUpdatingPriority ? (
            <div className="flex items-center gap-1">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Updating...</span>
            </div>
          ) : editingField === 'priority' ? (
            <Select value={priorityName} onValueChange={handlePriorityChange}>
              <SelectTrigger className="w-32 h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-1 cursor-pointer" onClick={() => setEditingField('priority')}>
              <span className={cn("flex items-center gap-1", priority.className)}>
                <PriorityIcon className="w-4 h-4" />
                {priority.label}
              </span>
              <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>

        {/* Type */}
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Tag className="w-4 h-4" />
            <span>Type</span>
          </div>
          {isUpdatingType ? (
            <div className="flex items-center gap-1">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Updating...</span>
            </div>
          ) : editingField === 'type' ? (
            <Select value={typeName} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-32 h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Functional">Functional</SelectItem>
                <SelectItem value="Regression">Regression</SelectItem>
                <SelectItem value="Smoke">Smoke</SelectItem>
                <SelectItem value="Integration">Integration</SelectItem>
                <SelectItem value="End-to-End">End-to-End</SelectItem>
                <SelectItem value="Performance">Performance</SelectItem>
                <SelectItem value="Security">Security</SelectItem>
                <SelectItem value="Usability">Usability</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-1 cursor-pointer" onClick={() => setEditingField('type')}>
              <Badge variant="outline" className={cn('text-xs capitalize', type.className)}>
                {typeName}
              </Badge>
              <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>

        {/* Assignee */}
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            <span>Assignee</span>
          </div>
          {isUpdatingAssignee ? (
            <div className="flex items-center gap-1">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Updating...</span>
            </div>
          ) : editingField === 'assignee' ? (
            <Select value={testCase.assigned_user?.id || ''} onValueChange={handleAssigneeChange}>
              <SelectTrigger className="w-40 h-7">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {isLoadingMembers ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">Loading...</div>
                ) : (
                  teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name || 'Unknown'}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-1 cursor-pointer" onClick={() => setEditingField('assignee')}>
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  {assigneeAvatar && <AvatarImage src={assigneeAvatar} alt={assigneeName} />}
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(assigneeName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{assigneeName}</span>
              </div>
              <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>

        {/* Estimated Time */}
        <PropertyField
          label="Est. Duration"
          icon={Clock}
          value={estimatedTime}
        />

        <hr className="my-4 border-border" />

        {/* Preconditions */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
            Preconditions
          </label>
          <p className="text-sm text-foreground">
            {testCase.preconditions || 'None specified'}
          </p>
        </div>

        {/* Tags */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
            Tags
          </label>
          <div className="flex flex-wrap gap-1">
            {dbLabels.map((label) => (
              <Badge key={label.id} variant="outline" className="text-xs group/tag">
                {label.name}
                <X 
                  className="w-3 h-3 ml-1 opacity-0 group-hover/tag:opacity-100 cursor-pointer transition-opacity" 
                  onClick={() => handleRemoveTag(label.id)}
                />
              </Badge>
            ))}
            
            {isAddingTag ? (
              <div className="flex items-center gap-1">
                <Input 
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTag();
                    if (e.key === 'Escape') {
                      setIsAddingTag(false);
                      setNewTag('');
                    }
                  }}
                  className="h-6 w-20 text-xs px-2"
                  autoFocus
                  placeholder="Tag name"
                />
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleAddTag} disabled={createLabelMutation.isPending}>
                  <Check className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setIsAddingTag(false); setNewTag(''); }}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setIsAddingTag(true)}>
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            )}
          </div>
        </div>

        <hr className="my-4 border-border" />

        {/* Metadata */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span className="text-foreground">{createdAt} by {createdByName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Updated</span>
            <span className="text-foreground">{updatedAt}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version</span>
            <span className="text-foreground">v{testCase.version || 1}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PropertyFieldProps {
  label: string;
  icon: React.ElementType;
  value: React.ReactNode;
  editable?: boolean;
}

function PropertyField({ label, icon: Icon, value, editable }: PropertyFieldProps) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm">{value}</span>
        {editable && (
          <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity" />
        )}
      </div>
    </div>
  );
}
