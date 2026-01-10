/**
 * Test Case Properties Panel Component
 */

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
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

export function TestCasePropertiesPanel({ testCase }: TestCasePropertiesPanelProps) {
  const status = statusConfig[testCase.status];
  const type = typeConfig[testCase.type];

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
        <PropertyField
          label="Status"
          icon={CircleDot}
          value={
            <Badge variant="outline" className={cn('text-xs', status.className)}>
              {status.label}
            </Badge>
          }
          editable
        />

        {/* Priority */}
        <PropertyField
          label="Priority"
          icon={Flag}
          value={
            <span className="flex items-center gap-1 text-red-600">
              <AlertTriangle className="w-4 h-4" />
              Critical
            </span>
          }
          editable
        />

        {/* Type */}
        <PropertyField
          label="Type"
          icon={Tag}
          value={
            <Badge variant="outline" className={cn('text-xs capitalize', type.className)}>
              {testCase.type}
            </Badge>
          }
          editable
        />

        {/* Assignee */}
        <PropertyField
          label="Assignee"
          icon={User}
          value={
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarFallback className={cn('text-xs', avatarColors[testCase.assignee.color])}>
                  {testCase.assignee.avatar}
                </AvatarFallback>
              </Avatar>
              <span>{testCase.assignee.name}</span>
            </div>
          }
          editable
        />

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
            {testCase.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
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
