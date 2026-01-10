/**
 * Test Case Properties Panel Component
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { TestCaseDetail } from '@/data/testCaseDetailData';

interface TestCasePropertiesPanelProps {
  testCase: TestCaseDetail;
}

const statusConfig = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  ready: { label: 'Ready', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  approved: { label: 'Approved', className: 'bg-green-50 text-green-700 border-green-200' },
  deprecated: { label: 'Deprecated', className: 'bg-red-50 text-red-600 border-red-200' },
};

const priorityConfig = {
  critical: { label: 'Critical', icon: AlertTriangle, className: 'text-red-600' },
  high: { label: 'High', icon: ArrowUp, className: 'text-orange-600' },
  medium: { label: 'Medium', icon: Minus, className: 'text-gray-600' },
  low: { label: 'Low', icon: ArrowDown, className: 'text-blue-600' },
};

const typeConfig = {
  functional: { className: 'bg-blue-50 text-blue-700 border-blue-200' },
  regression: { className: 'bg-purple-50 text-purple-700 border-purple-200' },
  smoke: { className: 'bg-orange-50 text-orange-700 border-orange-200' },
  integration: { className: 'bg-teal-50 text-teal-700 border-teal-200' },
  e2e: { className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
};

const avatarColors: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
};

const assigneeOptions = [
  { name: 'Vikram S.', avatar: 'VS', color: 'blue' },
  { name: 'Ahmed A.', avatar: 'AA', color: 'green' },
  { name: 'Sara K.', avatar: 'SK', color: 'purple' },
  { name: 'Mohammed R.', avatar: 'MR', color: 'orange' },
];

export function TestCasePropertiesPanel({ testCase: initialTestCase }: TestCasePropertiesPanelProps) {
  const [testCase, setTestCase] = useState(initialTestCase);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tags, setTags] = useState(initialTestCase.tags);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');

  const status = statusConfig[testCase.status];
  const type = typeConfig[testCase.type];
  const priority = priorityConfig[testCase.priority];
  const PriorityIcon = priority.icon;

  const handleStatusChange = (value: string) => {
    setTestCase({ ...testCase, status: value as TestCaseDetail['status'] });
    setEditingField(null);
    toast.success('Status updated');
  };

  const handlePriorityChange = (value: string) => {
    setTestCase({ ...testCase, priority: value as TestCaseDetail['priority'] });
    setEditingField(null);
    toast.success('Priority updated');
  };

  const handleTypeChange = (value: string) => {
    setTestCase({ ...testCase, type: value as TestCaseDetail['type'] });
    setEditingField(null);
    toast.success('Type updated');
  };

  const handleAssigneeChange = (value: string) => {
    const assignee = assigneeOptions.find(a => a.name === value);
    if (assignee) {
      setTestCase({ ...testCase, assignee });
      setEditingField(null);
      toast.success('Assignee updated');
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
      setIsAddingTag(false);
      toast.success('Tag added');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
    toast.success('Tag removed');
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
            <Link to={`/releases/all/${testCase.release}`} className="text-primary hover:underline">
              {testCase.release}
            </Link>
          }
        />

        {/* Folder */}
        <PropertyField
          label="Folder"
          icon={Folder}
          value={testCase.folder}
        />

        {/* Status */}
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleDot className="w-4 h-4" />
            <span>Status</span>
          </div>
          {editingField === 'status' ? (
            <Select value={testCase.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-32 h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="deprecated">Deprecated</SelectItem>
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
            <Select value={testCase.priority} onValueChange={handlePriorityChange}>
              <SelectTrigger className="w-32 h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
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
            <Select value={testCase.type} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-32 h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="functional">Functional</SelectItem>
                <SelectItem value="regression">Regression</SelectItem>
                <SelectItem value="smoke">Smoke</SelectItem>
                <SelectItem value="integration">Integration</SelectItem>
                <SelectItem value="e2e">E2E</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-1 cursor-pointer" onClick={() => setEditingField('type')}>
              <Badge variant="outline" className={cn('text-xs capitalize', type.className)}>
                {testCase.type}
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
          {editingField === 'assignee' ? (
            <Select value={testCase.assignee.name} onValueChange={handleAssigneeChange}>
              <SelectTrigger className="w-36 h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assigneeOptions.map((a) => (
                  <SelectItem key={a.name} value={a.name}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className={cn('text-[8px]', avatarColors[a.color])}>
                          {a.avatar}
                        </AvatarFallback>
                      </Avatar>
                      {a.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-1 cursor-pointer" onClick={() => setEditingField('assignee')}>
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className={cn('text-xs', avatarColors[testCase.assignee.color])}>
                    {testCase.assignee.avatar}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{testCase.assignee.name}</span>
              </div>
              <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>

        {/* Estimated Time */}
        <PropertyField
          label="Est. Duration"
          icon={Clock}
          value="5 minutes"
          editable
        />

        <hr className="my-4 border-border" />

        {/* Preconditions */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
            Preconditions
          </label>
          <p className="text-sm text-foreground">
            {testCase.preconditions}
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
            <span className="text-foreground">{testCase.createdAt} by {testCase.createdBy}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Updated</span>
            <span className="text-foreground">{testCase.updatedAt}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version</span>
            <span className="text-foreground">v{testCase.version}</span>
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
