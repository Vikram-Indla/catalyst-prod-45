/**
 * Test Case Properties Panel Component — Wired to real DB data
 */

import { useState } from 'react';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import type { TestCaseDetailData } from '@/hooks/test-management/useTestCases';

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
  'Smoke': { className: 'bg-orange-50 text-orange-700 border-orange-200' },
  'Integration': { className: 'bg-teal-50 text-teal-700 border-teal-200' },
  'E2E': { className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  'Performance': { className: 'bg-pink-50 text-pink-700 border-pink-200' },
  'Security': { className: 'bg-red-50 text-red-700 border-red-200' },
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
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>(testCase.labels?.map(l => l.name) || []);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');

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
    ? (testCase.release.version || testCase.release.name || 'Unassigned')
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

  const handleStatusChange = (value: string) => {
    setEditingField(null);
    toast.info('Status update not implemented yet');
  };

  const handlePriorityChange = (value: string) => {
    setEditingField(null);
    toast.info('Priority update not implemented yet');
  };

  const handleTypeChange = (value: string) => {
    setEditingField(null);
    toast.info('Type update not implemented yet');
  };

  const handleAssigneeChange = (value: string) => {
    setEditingField(null);
    toast.info('Assignee update not implemented yet');
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
      setIsAddingTag(false);
      toast.info('Tag management not persisted to DB yet');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
    toast.info('Tag management not persisted to DB yet');
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 sticky top-6">
      <h3 className="font-semibold text-foreground mb-4">Properties</h3>

      <div className="space-y-4">
        {/* Release */}
        <PropertyField
          label="Release"
          icon={Package}
          value={
            testCase.release?.id ? (
              <Link to={`/releases/all/${testCase.release.id}`} className="text-primary hover:underline">
                {releaseLabel}
              </Link>
            ) : (
              <span className="text-muted-foreground">{releaseLabel}</span>
            )
          }
        />

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
          {editingField === 'status' ? (
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
          {editingField === 'priority' ? (
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
          {editingField === 'type' ? (
            <Select value={typeName} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-32 h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Functional">Functional</SelectItem>
                <SelectItem value="Regression">Regression</SelectItem>
                <SelectItem value="Smoke">Smoke</SelectItem>
                <SelectItem value="Integration">Integration</SelectItem>
                <SelectItem value="E2E">E2E</SelectItem>
                <SelectItem value="Performance">Performance</SelectItem>
                <SelectItem value="Security">Security</SelectItem>
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
          <div className="flex items-center gap-1 cursor-pointer" onClick={() => setEditingField('assignee')}>
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                {assigneeAvatar && <AvatarImage src={assigneeAvatar} alt={assigneeName} />}
                <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                  {getInitials(assigneeName)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{assigneeName}</span>
            </div>
            <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
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
            {tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs group/tag">
                {tag}
                <X 
                  className="w-3 h-3 ml-1 opacity-0 group-hover/tag:opacity-100 cursor-pointer transition-opacity" 
                  onClick={() => handleRemoveTag(tag)}
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
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleAddTag}>
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
