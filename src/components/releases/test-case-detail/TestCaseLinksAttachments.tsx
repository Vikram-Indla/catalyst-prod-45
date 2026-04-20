/**
 * Test Case Links & Attachments Component
 * FULLY WIRED: Uses real DB data via hooks
 */

import { useState } from 'react';
import { Plus, Upload, FileText, Bug, BookOpen, Image, FileSpreadsheet, ExternalLink, X, Loader2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Lozenge } from '@/components/ads';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Real hooks
import { 
  useCaseRequirements, 
  useLinkRequirement,
  useUnlinkRequirement,
  REQUIREMENT_TYPE_LABELS,
  type RequirementType,
  type RequirementLink
} from '@/hooks/test-cases/useRequirementLinks';

interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
}

const itemTypeConfig: Record<string, { icon: typeof BookOpen; className: string }> = {
  story: { icon: FileText, className: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400' },
  epic: { icon: BookOpen, className: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400' },
  feature: { icon: FileText, className: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400' },
  business_request: { icon: FileText, className: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
  external: { icon: Bug, className: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
};

const fileTypeConfig: Record<string, { icon: typeof Image; className: string }> = {
  image: { icon: Image, className: 'text-pink-600 bg-pink-50 dark:bg-pink-900/30 dark:text-pink-400' },
  excel: { icon: FileSpreadsheet, className: 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400' },
  pdf: { icon: FileText, className: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
};

interface TestCaseLinksAttachmentsProps {
  testCaseId: string;
}

export function TestCaseLinksAttachments({ testCaseId }: TestCaseLinksAttachmentsProps) {
  // Real DB hooks
  const { data: linkedItems = [], isLoading: linksLoading } = useCaseRequirements(testCaseId);
  const linkMutation = useLinkRequirement();
  const unlinkMutation = useUnlinkRequirement();

  // Attachments - placeholder for future implementation
  const [attachments] = useState<Attachment[]>([]);
  
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkType, setLinkType] = useState<RequirementType>('external');
  const [externalKey, setExternalKey] = useState('');
  const [externalTitle, setExternalTitle] = useState('');
  const [externalUrl, setExternalUrl] = useState('');

  const handleAddLink = () => {
    if (!externalKey.trim()) {
      toast.error('Please enter an ID/key');
      return;
    }

    linkMutation.mutate(
      {
        caseId: testCaseId,
        requirementType: linkType,
        externalKey: externalKey.trim(),
        externalTitle: externalTitle.trim() || undefined,
        externalUrl: externalUrl.trim() || undefined,
      },
      {
        onSuccess: () => {
          setIsLinkModalOpen(false);
          setExternalKey('');
          setExternalTitle('');
          setExternalUrl('');
          toast.success('Link added successfully');
        },
        onError: (error) => {
          toast.error(`Failed to add link: ${error.message}`);
        },
      }
    );
  };

  const handleRemoveLink = (link: RequirementLink) => {
    unlinkMutation.mutate(
      { linkId: link.id, caseId: testCaseId },
      {
        onSuccess: () => {
          toast.success('Link removed');
        },
        onError: (error) => {
          toast.error(`Failed to remove link: ${error.message}`);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Linked Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-foreground">Linked Items</h4>
          <Button variant="ghost" size="sm" className="h-8" onClick={() => setIsLinkModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Link
          </Button>
        </div>

        {linksLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : linkedItems.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No linked items. Click "Add Link" to link requirements, stories, or external items.
          </div>
        ) : (
          <div className="space-y-2">
            {linkedItems.map((item) => {
              const config = itemTypeConfig[item.requirement_type] || itemTypeConfig.external;
              const Icon = config?.icon || FileText;

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors group"
                >
                  <div className={cn('p-2 rounded-lg', config?.className)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-primary">
                        {item.external_key || item.requirement_id || '—'}
                      </span>
                      <span className="text-sm text-foreground truncate">
                        {item.external_title || item.requirement_title || 'Untitled'}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {REQUIREMENT_TYPE_LABELS[item.requirement_type]}
                    </span>
                  </div>
                  {item.coverage_status && (
                    <Lozenge appearance="default">
                      {item.coverage_status}
                    </Lozenge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveLink(item)}
                    disabled={unlinkMutation.isPending}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  {item.external_url && (
                    <a 
                      href={item.external_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground cursor-pointer" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Attachments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-foreground">Attachments</h4>
          <Button variant="ghost" size="sm" className="h-8" disabled>
            <Upload className="w-4 h-4 mr-1" />
            Upload
          </Button>
        </div>

        {attachments.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-8 text-center">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Attachment uploads coming soon
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {attachments.map((att) => {
              const config = fileTypeConfig[att.type] || fileTypeConfig.pdf;
              const Icon = config.icon;

              return (
                <div
                  key={att.id}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer group"
                >
                  <div className={cn('p-2 rounded-lg', config.className)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{att.name}</p>
                    <p className="text-xs text-muted-foreground">{att.size}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Link Modal */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link Item</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Item Type</label>
              <Select value={linkType} onValueChange={(v) => setLinkType(v as RequirementType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="story">User Story</SelectItem>
                  <SelectItem value="epic">Epic</SelectItem>
                  <SelectItem value="feature">Feature</SelectItem>
                  <SelectItem value="business_request">Business Request</SelectItem>
                  <SelectItem value="external">External (Jira, etc.)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">ID / Key *</label>
              <Input 
                placeholder="e.g., JIRA-123, REQ-001" 
                value={externalKey}
                onChange={(e) => setExternalKey(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input 
                placeholder="Brief description..." 
                value={externalTitle}
                onChange={(e) => setExternalTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">URL (optional)</label>
              <Input 
                placeholder="https://..." 
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsLinkModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLink} disabled={linkMutation.isPending || !externalKey.trim()}>
              {linkMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Link'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
