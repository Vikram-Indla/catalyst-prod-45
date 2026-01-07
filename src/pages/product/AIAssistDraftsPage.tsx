import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Plus, 
  ChevronRight,
  Bot,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  PauseCircle,
  Globe,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DraftDetailsDrawer } from '@/components/ai-assist/DraftDetailsDrawer';
import { useAIAssistDrafts, useCreateDraft, type AIAssistDraft, type DraftStatus } from '@/hooks/useAIAssistDrafts';

// Wizard steps for reference
const WIZARD_STEPS = [
  { id: 1, name: 'Document Capture', key: 'capture' },
  { id: 2, name: 'AI Analysis', key: 'analysis' },
  { id: 3, name: 'FR Processing', key: 'fr' },
  { id: 4, name: 'Compliance Gate', key: 'compliance' },
  { id: 5, name: 'Clarification', key: 'clarification' },
  { id: 6, name: 'BRD Generation', key: 'brd' },
  { id: 7, name: 'BR Linking', key: 'linking' },
  { id: 8, name: 'Epic Publishing', key: 'publish' },
];

type ComplianceVerdict = 'pass' | 'fail' | 'pending' | 'na' | null;

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  draft: { label: 'Draft', variant: 'secondary', icon: <FileText className="h-3 w-3" /> },
  in_progress: { label: 'In Progress', variant: 'default', icon: <Clock className="h-3 w-3" /> },
  review: { label: 'Review', variant: 'outline', icon: <AlertCircle className="h-3 w-3" /> },
  approved: { label: 'Approved', variant: 'outline', icon: <CheckCircle className="h-3 w-3" /> },
  published: { label: 'Published', variant: 'outline', icon: <CheckCircle className="h-3 w-3" /> },
  archived: { label: 'Archived', variant: 'destructive', icon: <PauseCircle className="h-3 w-3" /> },
};

const VERDICT_CONFIG: Record<string, { label: string; className: string }> = {
  pass: { label: 'Compliant', className: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20' },
  pending: { label: 'Pending', className: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20' },
  fail: { label: 'Non-Compliant', className: 'bg-[hsl(var(--danger))]/10 text-[hsl(var(--danger))] border-[hsl(var(--danger))]/20' },
  na: { label: 'N/A', className: 'bg-muted text-muted-foreground border-muted' },
};

export default function AIAssistDraftsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DraftStatus | 'all'>('all');
  const [selectedDraft, setSelectedDraft] = useState<AIAssistDraft | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: drafts = [], isLoading } = useAIAssistDrafts();
  const createDraft = useCreateDraft();

  const filteredDrafts = drafts.filter((draft) => {
    const matchesSearch = 
      draft.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      draft.draft_key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || draft.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenWizard = (draftId: string) => {
    navigate(`/product/ai-assist/${draftId}`);
  };


  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Product</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">AI Assist</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Drafts</span>
        </div>
        <Button 
          onClick={() => createDraft.mutate({ title: 'New Draft' }, { onSuccess: (d) => navigate(`/product/ai-assist/${d.id}`) })}
          disabled={createDraft.isPending}
          className="gap-2"
        >
          {createDraft.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          New Draft
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-1)]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search drafts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1">
            {(['all', 'draft', 'in_progress', 'review', 'approved'] as const).map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter(status as DraftStatus | 'all')}
                className="text-xs"
              >
                {status === 'all' ? 'All' : (STATUS_CONFIG[status]?.label || status)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredDrafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Bot className="h-12 w-12 mb-4 opacity-50" />
            <p>No drafts found</p>
          </div>
        ) : (
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[var(--bg-2)] border-b border-[var(--border-subtle)]">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide sticky left-0 bg-[var(--bg-2)] z-10">Draft ID</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Title</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Lang</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Current Step</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Prompt Pack</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Compliance</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Quality</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Updated</th>
            </tr>
          </thead>
          <tbody>
            {filteredDrafts.map((draft) => {
              const statusConfig = STATUS_CONFIG[draft.status] || STATUS_CONFIG.draft;
              const verdictConfig = draft.compliance_verdict ? VERDICT_CONFIG[draft.compliance_verdict] : null;
              const currentStepName = WIZARD_STEPS.find(s => s.id === draft.current_step)?.name || '—';

              return (
                <tr
                  key={draft.id}
                  onClick={() => { setSelectedDraft(draft); setDrawerOpen(true); }}
                  className="border-b border-[var(--border-subtle)] hover:bg-[var(--row-hover)] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs sticky left-0 bg-inherit z-10">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-[hsl(var(--info))]" />
                      {draft.draft_key}
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate" title={draft.title}>
                    {draft.title}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      <span className="uppercase text-xs">{draft.language}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusConfig.variant} className="gap-1 text-xs">
                      {statusConfig.icon}
                      {statusConfig.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="text-muted-foreground">{draft.current_step}/8:</span>{' '}
                    {currentStepName}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{draft.prompt_pack_version || '—'}</td>
                  <td className="px-4 py-3">
                    {verdictConfig ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${verdictConfig.className}`}>
                        {verdictConfig.label}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {draft.quality_score !== null ? (
                      <span className={`font-medium ${
                        draft.quality_score >= 80 ? 'text-[hsl(var(--success))]' :
                        draft.quality_score >= 60 ? 'text-[hsl(var(--warning))]' :
                        'text-[hsl(var(--danger))]'
                      }`}>
                        {draft.quality_score}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(draft.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        )}
      </div>

      {/* Drawer for draft details */}
      <DraftDetailsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        draft={selectedDraft}
      />
    </div>
  );
}

