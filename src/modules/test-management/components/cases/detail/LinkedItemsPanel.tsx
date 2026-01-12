/**
 * Linked Items Panel - Section 3
 * Displays linked requirements and defects with linking capabilities
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  Link2,
  ExternalLink,
  Trash2,
  FileText,
  Bug,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LinkedRequirement, LinkedDefect } from '../../../types/test-case-detail';

// =============================================
// REQUIREMENT ITEM
// =============================================

interface RequirementItemProps {
  requirement: LinkedRequirement;
  isEditing: boolean;
  onUnlink: () => void;
}

function RequirementItem({ requirement, isEditing, onUnlink }: RequirementItemProps) {
  const statusConfig: Record<string, { icon: React.ElementType; color: string }> = {
    draft: { icon: Clock, color: 'text-slate-500' },
    approved: { icon: CheckCircle2, color: 'text-blue-500' },
    implemented: { icon: CheckCircle2, color: 'text-emerald-500' },
  };

  const config = statusConfig[requirement.status] || statusConfig.draft;
  const StatusIcon = config.icon;

  return (
    <div className="group flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-200 transition-colors">
      <div className="flex items-center justify-center w-8 h-8 bg-blue-50 rounded-lg shrink-0">
        <FileText className="w-4 h-4 text-blue-500" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {requirement.key}
          </Badge>
          <StatusIcon className={cn('w-3.5 h-3.5', config.color)} />
        </div>
        <p className="text-sm text-slate-700 mt-1 truncate">{requirement.title}</p>
        <p className="text-xs text-slate-400 mt-1">
          Linked {new Date(requirement.linkedAt).toLocaleDateString()}
          {requirement.linkedByName && ` by ${requirement.linkedByName}`}
        </p>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
          <a href={`/requirements/${requirement.requirementId}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </Button>
        {isEditing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onUnlink}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// =============================================
// DEFECT ITEM
// =============================================

interface DefectItemProps {
  defect: LinkedDefect;
  isEditing: boolean;
  onUnlink: () => void;
}

function DefectItem({ defect, isEditing, onUnlink }: DefectItemProps) {
  const severityColors: Record<string, string> = {
    blocker: 'bg-red-100 text-red-700 border-red-200',
    critical: 'bg-orange-100 text-orange-700 border-orange-200',
    major: 'bg-amber-100 text-amber-700 border-amber-200',
    minor: 'bg-blue-100 text-blue-700 border-blue-200',
    trivial: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const statusConfig: Record<string, { color: string; label: string }> = {
    open: { color: 'bg-red-500', label: 'Open' },
    in_progress: { color: 'bg-amber-500', label: 'In Progress' },
    resolved: { color: 'bg-blue-500', label: 'Resolved' },
    closed: { color: 'bg-emerald-500', label: 'Closed' },
    wont_fix: { color: 'bg-slate-500', label: "Won't Fix" },
  };

  const status = statusConfig[defect.status] || statusConfig.open;

  return (
    <div className="group flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-red-200 transition-colors">
      <div className="flex items-center justify-center w-8 h-8 bg-red-50 rounded-lg shrink-0">
        <Bug className="w-4 h-4 text-red-500" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-mono text-xs">
            {defect.key}
          </Badge>
          <Badge 
            variant="outline" 
            className={cn('text-xs capitalize', severityColors[defect.severity])}
          >
            {defect.severity}
          </Badge>
          <div className="flex items-center gap-1">
            <span className={cn('w-2 h-2 rounded-full', status.color)} />
            <span className="text-xs text-slate-500">{status.label}</span>
          </div>
        </div>
        <p className="text-sm text-slate-700 mt-1 truncate">{defect.title}</p>
        {defect.stepId && (
          <p className="text-xs text-slate-400 mt-1">
            Linked to step
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
          <a href={`/tests/defects/${defect.defectId}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </Button>
        {isEditing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onUnlink}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// =============================================
// LINK DIALOG
// =============================================

interface LinkDialogProps {
  type: 'requirement' | 'defect';
  isOpen: boolean;
  onClose: () => void;
  onLink: (itemId: string) => void;
}

function LinkDialog({ type, isOpen, onClose, onLink }: LinkDialogProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Array<{ id: string; key: string; title: string }>>([]);

  const handleSearch = () => {
    // Placeholder - would call API to search
    console.log('Searching for', type, search);
    // Mock results
    setResults([
      { id: '1', key: type === 'requirement' ? 'REQ-001' : 'DEF-001', title: 'Sample item' },
    ]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Link {type === 'requirement' ? 'Requirement' : 'Defect'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder={`Search ${type}s...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch}>
              <Search className="w-4 h-4" />
            </Button>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {results.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                Search for {type}s to link
              </p>
            ) : (
              results.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                  onClick={() => {
                    onLink(item.id);
                    onClose();
                  }}
                >
                  <div>
                    <Badge variant="outline" className="font-mono text-xs mb-1">
                      {item.key}
                    </Badge>
                    <p className="text-sm text-slate-700">{item.title}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================
// MAIN PANEL
// =============================================

interface LinkedItemsPanelProps {
  type: 'requirements' | 'defects';
  requirements?: LinkedRequirement[];
  defects?: LinkedDefect[];
  isEditing: boolean;
  onLinkRequirement?: (requirementId: string) => void;
  onUnlinkRequirement?: (linkId: string) => void;
  onLinkDefect?: (defectId: string, stepId?: string) => void;
  onUnlinkDefect?: (linkId: string) => void;
}

export function LinkedItemsPanel({
  type,
  requirements = [],
  defects = [],
  isEditing,
  onLinkRequirement,
  onUnlinkRequirement,
  onLinkDefect,
  onUnlinkDefect,
}: LinkedItemsPanelProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const items = type === 'requirements' ? requirements : defects;
  const itemType = type === 'requirements' ? 'requirement' : 'defect';
  const Icon = type === 'requirements' ? FileText : Bug;

  const handleLink = (itemId: string) => {
    if (type === 'requirements' && onLinkRequirement) {
      onLinkRequirement(itemId);
    } else if (type === 'defects' && onLinkDefect) {
      onLinkDefect(itemId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-medium text-slate-700 capitalize">
            Linked {type}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {items.length}
          </Badge>
        </div>

        {isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLinkDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Link {itemType}
          </Button>
        )}
      </div>

      {/* Items List */}
      {items.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Icon className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No linked {type}</p>
          {isEditing && (
            <Button
              variant="link"
              size="sm"
              className="mt-2"
              onClick={() => setLinkDialogOpen(true)}
            >
              Link your first {itemType}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {type === 'requirements'
            ? requirements.map((req) => (
                <RequirementItem
                  key={req.id}
                  requirement={req}
                  isEditing={isEditing}
                  onUnlink={() => onUnlinkRequirement?.(req.id)}
                />
              ))
            : defects.map((def) => (
                <DefectItem
                  key={def.id}
                  defect={def}
                  isEditing={isEditing}
                  onUnlink={() => onUnlinkDefect?.(def.id)}
                />
              ))}
        </div>
      )}

      {/* Link Dialog */}
      <LinkDialog
        type={itemType}
        isOpen={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        onLink={handleLink}
      />
    </div>
  );
}
