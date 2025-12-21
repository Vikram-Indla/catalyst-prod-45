/**
 * FeatureOverviewTab — Overview content for Feature detail page
 * 
 * Includes:
 * - Rich description
 * - Readiness snapshot (approvals, exceptions, dependencies)
 * - Acceptance criteria checklist
 * - Attachments
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  Zap, 
  Clock, 
  FileText,
  Upload,
  File,
  Image as ImageIcon,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { format } from 'date-fns';

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

// Mock attachments data (would come from attachments table)
const MOCK_ATTACHMENTS = [
  { id: '1', name: 'Compliance_Rules_Specification_v2.pdf', size: '2.4 MB', date: 'Dec 10, 2025', type: 'pdf' },
  { id: '2', name: 'Dashboard_Wireframes.fig', size: '8.1 MB', date: 'Dec 8, 2025', type: 'fig' },
  { id: '3', name: 'API_Integration_Guide.docx', size: '512 KB', date: 'Dec 5, 2025', type: 'docx' },
];

function getFileIcon(type: string) {
  switch (type) {
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
    default:
      return <File className="h-5 w-5 text-muted-foreground" />;
  }
}

export function FeatureOverviewTab({ feature }: FeatureOverviewTabProps) {
  const queryClient = useQueryClient();
  const criteria = parseAcceptanceCriteria(feature.acceptance_criteria);

  // Mock readiness data
  const readinessData = {
    approvalsPending: 2,
    exceptions: 1,
    dependenciesClear: 3,
    dependenciesTotal: 4,
  };

  const handleCriteriaToggle = (id: string, checked: boolean) => {
    // In a real implementation, this would update the acceptance_criteria text
    toast.success('Acceptance criteria updated');
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
            <CheckCircle2 className="h-4 w-4 text-brand-primary" />
            <span className="font-medium">{readinessData.approvalsPending}</span>
            <span className="text-muted-foreground">Approvals Pending</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-status-warning" />
            <span className="font-medium">{readinessData.exceptions}</span>
            <span className="text-muted-foreground">Exception</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-brand-primary" />
            <span className="font-medium">{readinessData.dependenciesClear}/{readinessData.dependenciesTotal}</span>
            <span className="text-muted-foreground">Deps Clear</span>
          </div>
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
          Attachments
        </h3>
        <div className="space-y-2">
          {MOCK_ATTACHMENTS.map((file) => (
            <div 
              key={file.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
            >
              {getFileIcon(file.type)}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-foreground truncate">
                  {file.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {file.size} · Uploaded {file.date}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
