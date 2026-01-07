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
  Hash,
  Globe
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

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

const SEED_DRAFTS: Draft[] = [
  {
    id: 'DFT-001',
    title: 'نظام إدارة المشاريع الحكومية',
    titleEn: 'Government Project Management System',
    language: 'ar',
    status: 'in_progress' as DraftStatus,
    currentStep: 4,
    lastRun: '2026-01-07T10:30:00Z',
    canonicalHash: 'a8f3e2b1',
    promptPack: 'dga-v2.1',
    sourcesPack: 'nca-2025',
    complianceVerdict: 'conditional' as ComplianceVerdict,
    qualityScore: 78,
    updatedAt: '2026-01-07T11:45:00Z',
  },
  {
    id: 'DFT-002',
    title: 'منصة التحول الرقمي',
    titleEn: 'Digital Transformation Platform',
    language: 'ar',
    status: 'complete',
    currentStep: 8,
    lastRun: '2026-01-06T14:20:00Z',
    canonicalHash: 'c4d9f7a3',
    promptPack: 'dga-v2.1',
    sourcesPack: 'nca-2025',
    complianceVerdict: 'compliant',
    qualityScore: 94,
    updatedAt: '2026-01-06T16:30:00Z',
  },
  {
    id: 'DFT-003',
    title: 'Enterprise Resource Planning Module',
    titleEn: 'Enterprise Resource Planning Module',
    language: 'en',
    status: 'blocked',
    currentStep: 5,
    lastRun: '2026-01-05T09:15:00Z',
    canonicalHash: 'e7b2c8d4',
    promptPack: 'dga-v2.0',
    sourcesPack: 'nca-2024',
    complianceVerdict: 'non_compliant',
    qualityScore: 45,
    updatedAt: '2026-01-05T11:00:00Z',
  },
  {
    id: 'DFT-004',
    title: 'نظام إدارة الموارد البشرية',
    titleEn: 'HR Management System',
    language: 'ar',
    status: 'draft',
    currentStep: 1,
    lastRun: null,
    canonicalHash: null,
    promptPack: 'dga-v2.1',
    sourcesPack: 'nca-2025',
    complianceVerdict: null,
    qualityScore: null,
    updatedAt: '2026-01-07T08:00:00Z',
  },
  {
    id: 'DFT-005',
    title: 'Customer Portal Integration',
    titleEn: 'Customer Portal Integration',
    language: 'en',
    status: 'in_progress',
    currentStep: 3,
    lastRun: '2026-01-07T07:45:00Z',
    canonicalHash: 'f1a5b9c2',
    promptPack: 'dga-v2.1',
    sourcesPack: 'nca-2025',
    complianceVerdict: null,
    qualityScore: 67,
    updatedAt: '2026-01-07T09:30:00Z',
  },
  {
    id: 'DFT-006',
    title: 'نظام التقارير التنفيذية',
    titleEn: 'Executive Reporting System',
    language: 'ar',
    status: 'complete',
    currentStep: 8,
    lastRun: '2026-01-04T13:00:00Z',
    canonicalHash: 'd3e8f6a7',
    promptPack: 'dga-v2.0',
    sourcesPack: 'nca-2024',
    complianceVerdict: 'compliant',
    qualityScore: 89,
    updatedAt: '2026-01-04T15:20:00Z',
  },
];

type DraftStatus = 'draft' | 'in_progress' | 'complete' | 'blocked';
type ComplianceVerdict = 'compliant' | 'conditional' | 'non_compliant' | null;

const STATUS_CONFIG: Record<DraftStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  draft: { label: 'Draft', variant: 'secondary', icon: <FileText className="h-3 w-3" /> },
  in_progress: { label: 'In Progress', variant: 'default', icon: <Clock className="h-3 w-3" /> },
  complete: { label: 'Complete', variant: 'outline', icon: <CheckCircle className="h-3 w-3" /> },
  blocked: { label: 'Blocked', variant: 'destructive', icon: <PauseCircle className="h-3 w-3" /> },
};

const VERDICT_CONFIG: Record<string, { label: string; className: string }> = {
  compliant: { label: 'Compliant', className: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20' },
  conditional: { label: 'Conditional', className: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20' },
  non_compliant: { label: 'Non-Compliant', className: 'bg-[hsl(var(--danger))]/10 text-[hsl(var(--danger))] border-[hsl(var(--danger))]/20' },
};

interface Draft {
  id: string;
  title: string;
  titleEn: string;
  language: string;
  status: DraftStatus;
  currentStep: number;
  lastRun: string | null;
  canonicalHash: string | null;
  promptPack: string;
  sourcesPack: string;
  complianceVerdict: ComplianceVerdict;
  qualityScore: number | null;
  updatedAt: string;
}

export default function AIAssistDraftsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DraftStatus | 'all'>('all');
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filteredDrafts = SEED_DRAFTS.filter((draft) => {
    const matchesSearch = 
      draft.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      draft.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      draft.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || draft.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRowClick = (draft: Draft) => {
    setSelectedDraft(draft);
    setDrawerOpen(true);
  };

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
        <Button onClick={() => navigate('/product/ai-assist/new')} className="gap-2">
          <Plus className="h-4 w-4" />
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
            {(['all', 'draft', 'in_progress', 'complete', 'blocked'] as const).map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter(status)}
                className="text-xs"
              >
                {status === 'all' ? 'All' : STATUS_CONFIG[status].label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[var(--bg-2)] border-b border-[var(--border-subtle)]">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide sticky left-0 bg-[var(--bg-2)] z-10">Draft ID</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Title</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Lang</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Current Step</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Last Run</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Hash</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Prompt Pack</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Sources</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Compliance</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Quality</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Updated</th>
            </tr>
          </thead>
          <tbody>
            {filteredDrafts.map((draft) => {
              const statusConfig = STATUS_CONFIG[draft.status];
              const verdictConfig = draft.complianceVerdict ? VERDICT_CONFIG[draft.complianceVerdict] : null;
              const currentStepName = WIZARD_STEPS.find(s => s.id === draft.currentStep)?.name || '—';

              return (
                <tr
                  key={draft.id}
                  onClick={() => handleRowClick(draft)}
                  className="border-b border-[var(--border-subtle)] hover:bg-[var(--row-hover)] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs sticky left-0 bg-inherit z-10">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-[hsl(var(--info))]" />
                      {draft.id}
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate" title={draft.title}>
                    {draft.language === 'ar' ? draft.title : draft.titleEn}
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
                    <span className="text-muted-foreground">{draft.currentStep}/8:</span>{' '}
                    {currentStepName}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(draft.lastRun)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {draft.canonicalHash ? (
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3 text-muted-foreground" />
                        {draft.canonicalHash}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{draft.promptPack}</td>
                  <td className="px-4 py-3 font-mono text-xs">{draft.sourcesPack}</td>
                  <td className="px-4 py-3">
                    {verdictConfig ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${verdictConfig.className}`}>
                        {verdictConfig.label}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {draft.qualityScore !== null ? (
                      <span className={`font-medium ${
                        draft.qualityScore >= 80 ? 'text-[hsl(var(--success))]' :
                        draft.qualityScore >= 60 ? 'text-[hsl(var(--warning))]' :
                        'text-[hsl(var(--danger))]'
                      }`}>
                        {draft.qualityScore}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(draft.updatedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Drawer for draft details */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          {selectedDraft && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-[hsl(var(--info))]" />
                  {selectedDraft.id}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Title</h4>
                  <p className="text-sm" dir={selectedDraft.language === 'ar' ? 'rtl' : 'ltr'}>
                    {selectedDraft.title}
                  </p>
                  {selectedDraft.language === 'ar' && (
                    <p className="text-sm text-muted-foreground mt-1">{selectedDraft.titleEn}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                    <Badge variant={STATUS_CONFIG[selectedDraft.status].variant} className="gap-1">
                      {STATUS_CONFIG[selectedDraft.status].icon}
                      {STATUS_CONFIG[selectedDraft.status].label}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Language</h4>
                    <p className="text-sm uppercase">{selectedDraft.language}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Current Step</h4>
                  <p className="text-sm">
                    Step {selectedDraft.currentStep} of 8: {WIZARD_STEPS.find(s => s.id === selectedDraft.currentStep)?.name}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Prompt Pack</h4>
                    <p className="text-sm font-mono">{selectedDraft.promptPack}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Sources Pack</h4>
                    <p className="text-sm font-mono">{selectedDraft.sourcesPack}</p>
                  </div>
                </div>

                {selectedDraft.canonicalHash && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Canonical Hash</h4>
                    <p className="text-sm font-mono">{selectedDraft.canonicalHash}</p>
                  </div>
                )}

                {selectedDraft.complianceVerdict && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Compliance Verdict</h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${VERDICT_CONFIG[selectedDraft.complianceVerdict].className}`}>
                      {VERDICT_CONFIG[selectedDraft.complianceVerdict].label}
                    </span>
                  </div>
                )}

                {selectedDraft.qualityScore !== null && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Quality Score</h4>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-[var(--bg-3)] rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            selectedDraft.qualityScore >= 80 ? 'bg-[hsl(var(--success))]' :
                            selectedDraft.qualityScore >= 60 ? 'bg-[hsl(var(--warning))]' :
                            'bg-[hsl(var(--danger))]'
                          }`}
                          style={{ width: `${selectedDraft.qualityScore}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{selectedDraft.qualityScore}%</span>
                    </div>
                  </div>
                )}

                <Button 
                  className="w-full mt-4" 
                  onClick={() => handleOpenWizard(selectedDraft.id)}
                >
                  {selectedDraft.status === 'draft' ? 'Start Wizard' : 'Resume Wizard'}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
