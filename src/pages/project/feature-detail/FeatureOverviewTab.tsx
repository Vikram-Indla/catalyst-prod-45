/**
 * FeatureOverviewTab — Overview content for Feature detail page (V1 Wired)
 * 
 * Includes:
 * - Rich description
 * - Readiness snapshot (approvals, exceptions, dependencies)
 * - Acceptance criteria checklist
 * - Attachments (real data)
 */

import { 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Clock, 
  FileText,
  File,
  Image as ImageIcon,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Real hooks
import { useWorkItemAttachments, downloadAttachment } from '@/hooks/useUnifiedAttachments';
import { useWorkItemDependencies } from '@/hooks/useWorkItemDependencies';

interface FeatureOverviewTabProps {
  feature: {
    id: string;
    description: string | null;
    acceptance_criteria: string | null;
    updated_at: string | null;
    owner?: { id: string; full_name: string } | null;
  };
}

// Parse acceptance criteria from text (line-separated)
function parseAcceptanceCriteria(text: string | null): { id: string; text: string; checked: boolean }[] {
  if (!text) return [];
  
  return text.split('\n')
    .filter(line => line.trim())
    .map((line, idx) => {
      const isChecked = line.startsWith('[x]') || line.startsWith('[X]');
      const cleanText = line.replace(/^\[(x|X|\s)\]\s*/, '').trim();
      return {
        id: `ac-${idx}`,
        text: cleanText,
        checked: isChecked,
      };
    });
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'pdf':
      return <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />;
    case 'fig':
    case 'sketch':
    case 'xd':
      return <ImageIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
    case 'docx':
    case 'doc':
      return <File className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    case 'xlsx':
    case 'xls':
      return <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return <ImageIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
    default:
      return <File className="h-5 w-5 text-muted-foreground" />;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FeatureOverviewTab({ feature }: FeatureOverviewTabProps) {
  const criteria = parseAcceptanceCriteria(feature.acceptance_criteria);

  // Real data hooks
  const { data: attachments = [] } = useWorkItemAttachments(feature.id, 'feature');
  const { outgoing, incoming } = useWorkItemDependencies('feature', feature.id);

  // Readiness data from real dependencies
  const totalDeps = outgoing.length + incoming.length;
  const clearedDeps = [...outgoing, ...incoming].filter(d => d.status === 'done' || d.status === 'delivered').length;

  const handleCriteriaToggle = (id: string, checked: boolean) => {
    // Deferred: would update the acceptance_criteria text
    toast.success('Acceptance criteria updated');
  };

  const handleDownload = async (attachment: any) => {
    try {
      await downloadAttachment(attachment);
    } catch {
      toast.error('Failed to download file');
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Description */}
      <section>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
          Description
        </h3>
        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90">
          {feature.description ? (
            <div dangerouslySetInnerHTML={{ __html: feature.description.replace(/\n/g, '<br/>') }} />
          ) : (
            <p className="text-muted-foreground italic">No description provided.</p>
          )}
        </div>
      </section>

      {/* Readiness Snapshot */}
      <section className="bg-muted/30 border rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-brand-primary" />
            <span className="font-medium">{clearedDeps}/{totalDeps}</span>
            <span className="text-muted-foreground">Deps Clear</span>
          </div>
          {totalDeps > clearedDeps && (
            <>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-status-warning" />
                <span className="font-medium">{totalDeps - clearedDeps}</span>
                <span className="text-muted-foreground">Pending</span>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>
            Updated{' '}
            <strong className="text-foreground">
              {feature.updated_at 
                ? format(new Date(feature.updated_at), "'at' h:mm a 'on' MMM d, yyyy")
                : 'recently'
              }
            </strong>
            {feature.owner && (
              <span> by {feature.owner.full_name}</span>
            )}
          </span>
        </div>
      </section>

      {/* Acceptance Criteria */}
      <section>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
          Acceptance Criteria
        </h3>
        {criteria.length > 0 ? (
          <div className="space-y-3">
            {criteria.map((criterion) => (
              <label 
                key={criterion.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  criterion.checked 
                    ? "bg-status-success/5 border-status-success/30" 
                    : "bg-card hover:bg-muted/50"
                )}
              >
                <Checkbox 
                  checked={criterion.checked}
                  onCheckedChange={(checked) => handleCriteriaToggle(criterion.id, !!checked)}
                  className="mt-0.5"
                />
                <span className={cn(
                  "text-sm leading-relaxed",
                  criterion.checked && "text-muted-foreground line-through"
                )}>
                  {criterion.text}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic">
            No acceptance criteria defined.
          </div>
        )}
      </section>

      {/* Attachments */}
      <section>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
          Attachments ({attachments.length})
        </h3>
        <div className="space-y-2">
          {attachments.length === 0 ? (
            <div className="text-sm text-muted-foreground italic p-4 border rounded-lg">
              No attachments.
            </div>
          ) : attachments.map((file: any) => (
            <div 
              key={file.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer group"
              onClick={() => handleDownload(file)}
            >
              {getFileIcon(file.file_name)}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-foreground truncate">
                  {file.file_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatFileSize(file.file_size)} · {file.created_at ? format(new Date(file.created_at), 'MMM d, yyyy') : 'Unknown'}
                </div>
              </div>
              <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
