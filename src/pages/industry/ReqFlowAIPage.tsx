/**
 * ReqFlow AI — BRD Generation Module (ProductHub)
 * 4-Screen Architecture: Library → Generate → Theater → Viewer
 * CATALYST10 Design System
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  FileText, Plus, Search, Trash2, Eye, Copy, Download, ChevronLeft,
  Sparkles, Upload, FileUp, ClipboardPaste, CheckCircle2, ArrowRight,
  ChevronDown, ChevronRight, Clipboard, ExternalLink, SortAsc, SortDesc,
  X, Filter, MoreHorizontal, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════

interface BrdDocument {
  id: string;
  title: string;
  template: number;
  language: string;
  sections: BrdSection[];
  requirements: BrdRequirement[];
  epics: BrdEpic[];
  uatCases: BrdUatCase[];
  created: string;
  updated: string;
  status: 'draft' | 'review' | 'approved';
  inputType: 'upload' | 'paste';
}

interface BrdSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

interface BrdRequirement {
  id: string;
  code: string;
  type: 'functional' | 'non-functional';
  priority: 'must' | 'should' | 'could' | 'wont';
  description: string;
  acceptance: string;
}

interface BrdEpic {
  id: string;
  title: string;
  description: string;
  stories: { id: string; title: string; points: number; priority: string }[];
}

interface BrdUatCase {
  id: string;
  scenario: string;
  given: string;
  when: string;
  then: string;
  priority: 'high' | 'medium' | 'low';
}

type Screen = 'library' | 'generate' | 'theater' | 'viewer';
type SortField = 'title' | 'template' | 'created' | 'status';
type SortDir = 'asc' | 'desc';

const TEMPLATES = [
  { id: 0, name: 'IIBA / BABOK V3', sections: 18, bg: '#EFF6FF', color: '#2563EB' },
  { id: 1, name: 'McKinsey / MBB', sections: 14, bg: '#F5F3FF', color: '#7C3AED' },
  { id: 2, name: 'Big 4 / KPMG-Deloitte', sections: 20, bg: '#FEF3C7', color: '#D97706' },
  { id: 3, name: 'SAFe 6.0 / Lean', sections: 14, bg: '#ECFDF5', color: '#059669' },
  { id: 4, name: 'Accenture / SI', sections: 16, bg: '#FFF7ED', color: '#C2410C' },
  { id: 5, name: 'Government / Public Sector', sections: 18, bg: '#FEF2F2', color: '#B91C1C' },
] as const;

const TEMPLATE_SECTIONS: Record<number, string[]> = {
  0: ['Executive Summary','Business Context','Stakeholder Analysis','Current State Assessment','Future State Vision','Business Requirements','Functional Requirements','Non-Functional Requirements','Data Requirements','Integration Requirements','User Interface Requirements','Security & Compliance','Risk Assessment','Implementation Approach','Change Management','Testing Strategy','Appendices','Glossary'],
  1: ['Executive Summary','Problem Statement','Situation Analysis','Hypothesis Framework','Data Analysis','Key Findings','Strategic Options','Recommended Solution','Implementation Roadmap','Financial Impact','Risk Mitigation','Governance Model','Success Metrics','Next Steps'],
  2: ['Executive Summary','Engagement Overview','Current State Assessment','Gap Analysis','Future State Design','Business Requirements','Functional Specifications','Technical Architecture','Data Migration Plan','Integration Architecture','Security Framework','Compliance Requirements','Testing & QA Strategy','Deployment Strategy','Training & Enablement','Change Management Plan','Risk Register','Governance & RACI','Budget & Timeline','Appendices'],
  3: ['Lean Business Case','Solution Context','Portfolio Vision','Value Stream Mapping','Feature Breakdown','Enabler Requirements','Non-Functional Requirements','Architecture Runway','PI Planning Inputs','Release Strategy','Inspect & Adapt','DevOps Pipeline','Metrics & KPIs','Appendices'],
  4: ['Executive Summary','Project Charter','Business Case','Current State Analysis','Target Operating Model','Business Requirements','Functional Design','Technical Design','Integration Strategy','Data Strategy','Security & Privacy','Cloud Architecture','Implementation Phases','Testing Strategy','Organizational Readiness','Go-Live Criteria'],
  5: ['Executive Summary','Policy Context','Legislative Framework','Stakeholder Register','As-Is Assessment','To-Be Vision','Business Requirements','Functional Requirements','Non-Functional Requirements','Data Sovereignty & Privacy','Accessibility (WCAG 2.1)','Security Classification','Integration with GovTech','Citizen Impact Assessment','Risk & Issues Log','Implementation Schedule','Budget Estimate','Approval Authority'],
};

const LANGUAGES = ['English', 'French', 'Arabic', 'Spanish', 'German'] as const;

const LS_KEY = 'reqflow_brds';

// ═══════════════════════════════════════════════════════════════
// PERSISTENCE HELPERS
// ═══════════════════════════════════════════════════════════════

function loadBrds(): BrdDocument[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveBrds(brds: BrdDocument[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(brds));
}

function nextBrdId(brds: BrdDocument[]): string {
  const max = brds.reduce((m, b) => {
    const n = parseInt(b.id.replace('BRD-', ''), 10);
    return n > m ? n : m;
  }, 0);
  return `BRD-${String(max + 1).padStart(3, '0')}`;
}

// ═══════════════════════════════════════════════════════════════
// GENERATE BRD (MOCK)
// ═══════════════════════════════════════════════════════════════

function generateMockBrd(templateId: number, language: string, brds: BrdDocument[]): BrdDocument {
  const tpl = TEMPLATES[templateId];
  const secs = TEMPLATE_SECTIONS[templateId] || TEMPLATE_SECTIONS[0];
  const id = nextBrdId(brds);
  const now = new Date().toISOString();

  const sections: BrdSection[] = secs.map((title, i) => ({
    id: `sec-${i}`,
    title,
    content: `This section covers ${title.toLowerCase()} for the project. Detailed analysis and recommendations are provided based on the ${tpl.name} methodology framework. Key considerations include stakeholder alignment, technical feasibility, and organizational readiness for the proposed changes.`,
    order: i,
  }));

  const funcReqs = Math.floor(Math.random() * 15) + 20;
  const nfReqs = Math.floor(Math.random() * 8) + 8;
  const requirements: BrdRequirement[] = [];
  for (let i = 0; i < funcReqs; i++) {
    requirements.push({
      id: `FR-${String(i + 1).padStart(3, '0')}`,
      code: `FR-${String(i + 1).padStart(3, '0')}`,
      type: 'functional',
      priority: (['must', 'should', 'could', 'wont'] as const)[Math.floor(Math.random() * 3)],
      description: `The system shall provide capability ${i + 1} as defined in the business requirements specification.`,
      acceptance: `Verify that capability ${i + 1} functions correctly under standard and edge-case conditions.`,
    });
  }
  for (let i = 0; i < nfReqs; i++) {
    requirements.push({
      id: `NFR-${String(i + 1).padStart(3, '0')}`,
      code: `NFR-${String(i + 1).padStart(3, '0')}`,
      type: 'non-functional',
      priority: (['must', 'should', 'could'] as const)[Math.floor(Math.random() * 3)],
      description: `The system shall meet non-functional requirement ${i + 1} for performance, security, or scalability.`,
      acceptance: `Measure and validate non-functional requirement ${i + 1} against defined thresholds.`,
    });
  }

  const epicCount = Math.floor(Math.random() * 4) + 4;
  const epics: BrdEpic[] = [];
  for (let i = 0; i < epicCount; i++) {
    const storyCount = Math.floor(Math.random() * 5) + 3;
    epics.push({
      id: `EPIC-${i + 1}`,
      title: `Epic ${i + 1}: ${['User Management', 'Data Integration', 'Reporting Engine', 'Notification System', 'Workflow Automation', 'Security Module', 'Analytics Dashboard', 'API Gateway'][i % 8]}`,
      description: `This epic covers the implementation of major feature area ${i + 1}.`,
      stories: Array.from({ length: storyCount }, (_, j) => ({
        id: `US-${i + 1}.${j + 1}`,
        title: `Story ${j + 1} for Epic ${i + 1}`,
        points: [1, 2, 3, 5, 8, 13][Math.floor(Math.random() * 6)],
        priority: (['high', 'medium', 'low'] as const)[Math.floor(Math.random() * 3)],
      })),
    });
  }

  const uatCount = Math.floor(Math.random() * 40) + 30;
  const uatCases: BrdUatCase[] = Array.from({ length: uatCount }, (_, i) => ({
    id: `UAT-${String(i + 1).padStart(3, '0')}`,
    scenario: `Scenario ${i + 1}: Validate ${['login', 'data entry', 'report generation', 'notification delivery', 'search functionality', 'export feature', 'permission check', 'workflow trigger'][i % 8]}`,
    given: `Given the user is authenticated and has appropriate permissions`,
    when: `When the user performs the designated action for scenario ${i + 1}`,
    then: `Then the system responds correctly and all acceptance criteria are met`,
    priority: (['high', 'medium', 'low'] as const)[Math.floor(Math.random() * 3)],
  }));

  return {
    id,
    title: `${tpl.name} Business Requirements Document`,
    template: templateId,
    language,
    sections,
    requirements,
    epics,
    uatCases,
    created: now,
    updated: now,
    status: 'draft',
    inputType: 'paste',
  };
}


// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ReqFlowAIPage() {
  const [screen, setScreen] = useState<Screen>('library');
  const [brds, setBrds] = useState<BrdDocument[]>(loadBrds);
  const [viewingBrd, setViewingBrd] = useState<BrdDocument | null>(null);
  const [search, setSearch] = useState('');
  const [templateFilter, setTemplateFilter] = useState<number | -1>(-1);
  const [sortField, setSortField] = useState<SortField>('created');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Generate screen state
  const [genTemplate, setGenTemplate] = useState(0);
  const [genLanguage, setGenLanguage] = useState('English');
  const [genInputMode, setGenInputMode] = useState<'upload' | 'paste'>('paste');
  const [genPasteText, setGenPasteText] = useState('');
  const [genFileName, setGenFileName] = useState('');

  // Theater state
  const [theaterProgress, setTheaterProgress] = useState(0);
  const [theaterStage, setTheaterStage] = useState('');
  const theaterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Viewer state
  const [viewerTab, setViewerTab] = useState<'brd' | 'reqs' | 'epics' | 'uat'>('brd');
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
  const [reqSearch, setReqSearch] = useState('');

  // Persist on change
  useEffect(() => { saveBrds(brds); }, [brds]);

  // Stats
  const totalReqs = useMemo(() => brds.reduce((a, b) => a + b.requirements.length, 0), [brds]);
  const totalEpics = useMemo(() => brds.reduce((a, b) => a + b.epics.length, 0), [brds]);
  const totalUat = useMemo(() => brds.reduce((a, b) => a + b.uatCases.length, 0), [brds]);

  // Filtered & sorted library
  const filteredBrds = useMemo(() => {
    let list = [...brds];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(b => b.title.toLowerCase().includes(q) || b.id.toLowerCase().includes(q));
    }
    if (templateFilter !== -1) {
      list = list.filter(b => b.template === templateFilter);
    }
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title': cmp = a.title.localeCompare(b.title); break;
        case 'template': cmp = a.template - b.template; break;
        case 'created': cmp = new Date(a.created).getTime() - new Date(b.created).getTime(); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [brds, search, templateFilter, sortField, sortDir]);

  // Navigation
  const goLibrary = useCallback(() => {
    setScreen('library');
    setSearch('');
    setSelectedIds(new Set());
  }, []);

  const goGenerate = useCallback(() => {
    setScreen('generate');
    setGenPasteText('');
    setGenFileName('');
  }, []);

  const goViewer = useCallback((brd: BrdDocument) => {
    setViewingBrd(brd);
    setViewerTab('brd');
    setExpandedEpics(new Set());
    setReqSearch('');
    setScreen('viewer');
  }, []);

  // CRUD
  const handleDuplicate = useCallback((brd: BrdDocument) => {
    const dup: BrdDocument = JSON.parse(JSON.stringify(brd));
    dup.id = nextBrdId(brds);
    dup.title = brd.title + ' (Copy)';
    dup.created = new Date().toISOString();
    dup.updated = new Date().toISOString();
    setBrds(prev => [dup, ...prev]);
    toast.success('BRD duplicated', { description: dup.id });
  }, [brds]);

  const handleDelete = useCallback((id: string) => {
    setBrds(prev => prev.filter(b => b.id !== id));
    toast.success('BRD deleted');
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    setBrds(prev => prev.filter(b => !selectedIds.has(b.id)));
    toast.success(`${selectedIds.size} BRD(s) deleted`);
    setSelectedIds(new Set());
  }, [selectedIds]);

  const handleRename = useCallback((id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setBrds(prev => prev.map(b => b.id === id ? { ...b, title: newTitle.trim(), updated: new Date().toISOString() } : b));
  }, []);

  const handleExport = useCallback((brd: BrdDocument) => {
    const html = `<!DOCTYPE html><html><head><title>${brd.title}</title><style>body{font-family:'Plus Jakarta Sans',sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1e293b}h1{font-size:28px;border-bottom:2px solid #2563eb;padding-bottom:12px}h2{font-size:20px;color:#2563eb;margin-top:32px}p{line-height:1.7;font-size:14px}.meta{color:#64748b;font-size:12px;margin-bottom:24px}</style></head><body><h1>${brd.title}</h1><div class="meta">ID: ${brd.id} | Template: ${TEMPLATES[brd.template].name} | Generated: ${new Date(brd.created).toLocaleDateString()}</div>${brd.sections.map(s => `<h2>${s.order + 1}. ${s.title}</h2><p>${s.content}</p>`).join('')}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${brd.id}_${brd.title.replace(/[^a-zA-Z0-9]/g, '_')}.html`; a.click();
    URL.revokeObjectURL(url);
    toast.success('BRD exported as HTML');
  }, []);

  const handleExportUat = useCallback((brd: BrdDocument) => {
    const header = 'ID\tScenario\tGiven\tWhen\tThen\tPriority\n';
    const rows = brd.uatCases.map(u => `${u.id}\t${u.scenario}\t${u.given}\t${u.when}\t${u.then}\t${u.priority}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${brd.id}_UAT.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('UAT exported as CSV');
  }, []);

  const handleCopyAll = useCallback((brd: BrdDocument) => {
    const text = brd.sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n');
    navigator.clipboard.writeText(text);
    toast.success('BRD copied to clipboard');
  }, []);

  const handleCopySection = useCallback((section: BrdSection) => {
    navigator.clipboard.writeText(`## ${section.title}\n\n${section.content}`);
    toast.success(`"${section.title}" copied`);
  }, []);

  const handleJiraPublish = useCallback(() => {
    toast.success('Published to Jira', { description: 'Epics and stories synced successfully.' });
  }, []);

  // Generate flow
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.pdf') || file.name.endsWith('.docx') || file.name.endsWith('.doc'))) {
      setGenFileName(file.name);
      setGenInputMode('upload');
      toast.success(`File loaded: ${file.name}`);
    } else {
      toast.error('Only PDF and DOCX files are supported');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGenFileName(file.name);
      setGenInputMode('upload');
      toast.success(`File loaded: ${file.name}`);
    }
  }, []);

  const canGenerate = genInputMode === 'upload' ? !!genFileName : genPasteText.trim().length >= 20;

  const startGeneration = useCallback(() => {
    setScreen('theater');
    setTheaterProgress(0);
    setTheaterStage('Analyzing input document...');

    const stages = [
      { at: 10, label: 'Extracting key themes...' },
      { at: 25, label: 'Mapping stakeholder requirements...' },
      { at: 40, label: 'Generating functional requirements...' },
      { at: 55, label: 'Building epic & story hierarchy...' },
      { at: 70, label: 'Composing BRD sections...' },
      { at: 85, label: 'Generating UAT scenarios...' },
      { at: 95, label: 'Finalizing document...' },
    ];

    let progress = 0;
    theaterTimerRef.current = setInterval(() => {
      progress += Math.random() * 3 + 1;
      if (progress >= 100) {
        progress = 100;
        if (theaterTimerRef.current) clearInterval(theaterTimerRef.current);
        // Generate BRD
        const newBrd = generateMockBrd(genTemplate, genLanguage, brds);
        setBrds(prev => [newBrd, ...prev]);
        setTimeout(() => goViewer(newBrd), 600);
      }
      setTheaterProgress(Math.min(progress, 100));
      const stage = [...stages].reverse().find(s => progress >= s.at);
      if (stage) setTheaterStage(stage.label);
    }, 120);
  }, [genTemplate, genLanguage, brds, goViewer]);

  useEffect(() => {
    return () => { if (theaterTimerRef.current) clearInterval(theaterTimerRef.current); };
  }, []);

  // Sort toggle
  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }, [sortField]);

  // Select
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredBrds.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredBrds.map(b => b.id)));
  }, [selectedIds.size, filteredBrds]);

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--background)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {screen === 'library' && renderLibrary()}
      {screen === 'generate' && renderGenerate()}
      {screen === 'theater' && renderTheater()}
      {screen === 'viewer' && viewingBrd && renderViewer(viewingBrd)}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // SCREEN 1: LIBRARY
  // ═══════════════════════════════════════════════════════════════

  function renderLibrary() {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-5 pb-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="font-semibold text-foreground" style={{ fontSize: '24px', lineHeight: '32px' }}>
                ReqFlow AI
              </h1>
              <p className="text-muted-foreground" style={{ fontSize: '13px', marginTop: '2px' }}>
                AI-powered Business Requirements Document generator
              </p>
            </div>
            <button
              onClick={goGenerate}
              className="inline-flex items-center gap-2 rounded-[10px] font-semibold text-white transition-all hover:-translate-y-0.5"
              style={{
                height: '36px', padding: '0 16px', fontSize: '13px',
                background: '#2563EB',
                boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
              }}
            >
              <Sparkles size={14} />
              Generate New BRD
            </button>
          </div>

          {/* Stats strip */}
          <div className="flex items-center" style={{ gap: '16px', fontSize: '13px', fontWeight: 500 }}>
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{brds.length}</span> BRDs
            </span>
            <span style={{ color: 'hsl(var(--border))' }}>·</span>
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{totalReqs}</span> Requirements
            </span>
            <span style={{ color: 'hsl(var(--border))' }}>·</span>
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{totalEpics}</span> Epics
            </span>
            <span style={{ color: 'hsl(var(--border))' }}>·</span>
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{totalUat}</span> UAT Cases
            </span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex-shrink-0 px-6 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <div className="relative flex-1" style={{ maxWidth: '320px' }}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search BRDs... ( / )"
              className="w-full rounded-md bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              style={{
                height: '32px', paddingLeft: '32px', paddingRight: '12px',
                fontSize: '13px', border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
          </div>

          {/* Template filter */}
          <div className="relative">
            <select
              value={templateFilter}
              onChange={e => setTemplateFilter(Number(e.target.value))}
              className="appearance-none cursor-pointer rounded-md bg-transparent text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              style={{
                height: '32px', padding: '0 28px 0 12px',
                fontSize: '13px', fontWeight: 500, border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            >
              <option value={-1}>All Templates</option>
              {TEMPLATES.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
          </div>

          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors"
              style={{ height: '32px', padding: '0 12px', fontSize: '13px', fontWeight: 500, border: '1px solid hsl(var(--destructive) / 0.3)', borderRadius: '6px' }}
            >
              <Trash2 size={13} />
              Delete Selected ({selectedIds.size})
            </button>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {filteredBrds.length === 0 ? (
            brds.length === 0 ? (
              /* Empty state — no BRDs at all */
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: '#EFF6FF' }}>
                  <FileText size={28} style={{ color: '#2563EB' }} />
                </div>
                <h3 className="font-semibold text-foreground" style={{ fontSize: '16px', marginBottom: '8px' }}>
                  No BRDs yet
                </h3>
                <p className="text-muted-foreground" style={{ fontSize: '13px', maxWidth: '360px', marginBottom: '20px' }}>
                  Generate your first Business Requirements Document using AI-powered analysis of your project documents.
                </p>
                <button
                  onClick={goGenerate}
                  className="inline-flex items-center gap-2 rounded-[10px] font-semibold text-white transition-all hover:-translate-y-0.5"
                  style={{ height: '36px', padding: '0 16px', fontSize: '13px', background: '#2563EB' }}
                >
                  <Sparkles size={14} />
                  Generate New BRD
                </button>
              </div>
            ) : (
              /* Filter no-results */
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'hsl(var(--muted))' }}>
                  <Search size={20} className="text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground" style={{ fontSize: '14px', marginBottom: '4px' }}>No results found</h3>
                <p className="text-muted-foreground" style={{ fontSize: '13px' }}>Try adjusting your search or filter criteria.</p>
              </div>
            )
          ) : (
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'hsl(var(--muted))' }}>
                  <th style={{ width: '40px', height: '36px', padding: '0 12px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredBrds.length && filteredBrds.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                      style={{ width: '14px', height: '14px' }}
                    />
                  </th>
                  {[
                    { field: 'title' as SortField, label: 'BRD', flex: true },
                    { field: 'template' as SortField, label: 'TEMPLATE', width: '180px' },
                    { field: 'status' as SortField, label: 'STATUS', width: '100px' },
                    { field: 'created' as SortField, label: 'CREATED', width: '120px' },
                  ].map(col => (
                    <th
                      key={col.field}
                      onClick={() => toggleSort(col.field)}
                      className="cursor-pointer select-none text-left"
                      style={{
                        height: '36px', padding: '0 12px',
                        fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: '0.05em', color: 'hsl(var(--muted-foreground))',
                        borderBottom: '1px solid hsl(var(--border))',
                        width: col.width || undefined,
                      }}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {sortField === col.field && (sortDir === 'asc' ? <SortAsc size={11} /> : <SortDesc size={11} />)}
                      </span>
                    </th>
                  ))}
                  <th style={{ width: '100px', height: '36px', padding: '0 12px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--muted-foreground))', borderBottom: '1px solid hsl(var(--border))' }}>
                    REQS
                  </th>
                  <th style={{ width: '100px', height: '36px', padding: '0 12px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--muted-foreground))', borderBottom: '1px solid hsl(var(--border))' }}>
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBrds.map(brd => {
                  const tpl = TEMPLATES[brd.template];
                  return (
                    <tr
                      key={brd.id}
                      className="group cursor-pointer transition-colors hover:bg-accent/5"
                      onClick={() => goViewer(brd)}
                      style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)' }}
                    >
                      <td
                        style={{ width: '40px', height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle' }}
                        onClick={e => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(brd.id)}
                          onChange={() => toggleSelect(brd.id)}
                          className="rounded"
                          style={{ width: '14px', height: '14px' }}
                        />
                      </td>
                      <td style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle' }}>
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <span className="font-mono text-muted-foreground" style={{ fontSize: '11px', flexShrink: 0 }}>{brd.id}</span>
                          <input
                            type="text"
                            defaultValue={brd.title}
                            onBlur={e => handleRename(brd.id, e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="bg-transparent border-none outline-none text-foreground hover:bg-accent/10 focus:bg-accent/10 rounded px-1 -mx-1 truncate w-full"
                            style={{ fontSize: '14px', fontWeight: 500, height: '28px' }}
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                      </td>
                      <td style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle' }}>
                        <span
                          className="inline-flex items-center rounded-full"
                          style={{
                            height: '22px', padding: '0 8px',
                            fontSize: '11px', fontWeight: 500,
                            background: tpl.bg, color: tpl.color,
                          }}
                        >
                          {tpl.name}
                        </span>
                      </td>
                      <td style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle' }}>
                        <span
                          className="inline-flex items-center rounded-full capitalize"
                          style={{
                            height: '22px', padding: '0 8px',
                            fontSize: '11px', fontWeight: 500,
                            background: brd.status === 'approved' ? '#ECFDF5' : brd.status === 'review' ? '#FEF3C7' : '#F1F5F9',
                            color: brd.status === 'approved' ? '#059669' : brd.status === 'review' ? '#D97706' : '#64748B',
                          }}
                        >
                          {brd.status}
                        </span>
                      </td>
                      <td className="text-muted-foreground" style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle', fontSize: '13px' }}>
                        {new Date(brd.created).toLocaleDateString()}
                      </td>
                      <td style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle' }}>
                        <span className="font-mono" style={{ fontSize: '13px', fontWeight: 500 }}>
                          {brd.requirements.filter(r => r.type === 'functional').length}F + {brd.requirements.filter(r => r.type === 'non-functional').length}NF
                        </span>
                      </td>
                      <td
                        style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle' }}
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => goViewer(brd)} className="p-1 rounded hover:bg-accent/10 text-muted-foreground hover:text-foreground" title="View"><Eye size={14} /></button>
                          <button onClick={() => handleDuplicate(brd)} className="p-1 rounded hover:bg-accent/10 text-muted-foreground hover:text-foreground" title="Duplicate"><Copy size={14} /></button>
                          <button onClick={() => handleExport(brd)} className="p-1 rounded hover:bg-accent/10 text-muted-foreground hover:text-foreground" title="Export"><Download size={14} /></button>
                          <button onClick={() => handleDelete(brd.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // SCREEN 2: GENERATE
  // ═══════════════════════════════════════════════════════════════

  function renderGenerate() {
    const tpl = TEMPLATES[genTemplate];
    const sections = TEMPLATE_SECTIONS[genTemplate] || [];

    return (
      <div className="flex flex-col h-full overflow-auto">
        {/* Back */}
        <div className="flex-shrink-0 px-6 pt-4 pb-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <button
            onClick={goLibrary}
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            style={{ fontSize: '13px', fontWeight: 500 }}
          >
            <ChevronLeft size={14} />
            Back to Library
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-6" style={{ maxWidth: '720px', margin: '0 auto', width: '100%' }}>
          <h2 className="font-semibold text-foreground" style={{ fontSize: '20px', marginBottom: '4px' }}>
            Generate New BRD
          </h2>
          <p className="text-muted-foreground" style={{ fontSize: '13px', marginBottom: '24px' }}>
            Select a template methodology and provide your source document or text.
          </p>

          {/* Template selection */}
          <div style={{ marginBottom: '24px' }}>
            <label className="block font-medium text-foreground" style={{ fontSize: '13px', marginBottom: '8px' }}>
              Template Methodology
            </label>
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setGenTemplate(t.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border text-left transition-all',
                    genTemplate === t.id ? 'ring-2 ring-ring' : 'hover:border-ring/50'
                  )}
                  style={{
                    padding: '10px 12px',
                    borderColor: genTemplate === t.id ? '#2563EB' : 'hsl(var(--border))',
                    background: genTemplate === t.id ? '#EFF6FF08' : 'transparent',
                  }}
                >
                  <span
                    className="inline-flex items-center justify-center rounded-md flex-shrink-0"
                    style={{ width: '32px', height: '32px', background: t.bg, color: t.color, fontSize: '11px', fontWeight: 700 }}
                  >
                    {t.sections}
                  </span>
                  <div className="min-w-0">
                    <div className="text-foreground truncate" style={{ fontSize: '13px', fontWeight: 500 }}>{t.name}</div>
                    <div className="text-muted-foreground" style={{ fontSize: '11px' }}>{t.sections} sections</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section chips */}
          <div style={{ marginBottom: '24px' }}>
            <label className="block text-muted-foreground" style={{ fontSize: '11px', fontWeight: 500, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Sections ({sections.length})
            </label>
            <div className="flex flex-wrap gap-1.5">
              {sections.map((s, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded"
                  style={{ height: '22px', padding: '0 6px', fontSize: '11px', fontWeight: 400, background: tpl.bg, color: tpl.color }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Language */}
          <div style={{ marginBottom: '24px' }}>
            <label className="block font-medium text-foreground" style={{ fontSize: '13px', marginBottom: '8px' }}>
              Language
            </label>
            <div className="relative" style={{ maxWidth: '200px' }}>
              <select
                value={genLanguage}
                onChange={e => setGenLanguage(e.target.value)}
                className="w-full appearance-none rounded-md bg-transparent text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                style={{ height: '36px', padding: '0 28px 0 12px', fontSize: '13px', border: '1px solid hsl(var(--border))', borderRadius: '6px' }}
              >
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
            </div>
          </div>

          {/* Input mode tabs */}
          <div style={{ marginBottom: '16px' }}>
            <label className="block font-medium text-foreground" style={{ fontSize: '13px', marginBottom: '8px' }}>
              Input Source
            </label>
            <div className="inline-flex rounded-lg p-0.5" style={{ background: 'hsl(var(--muted))', gap: '2px' }}>
              <button
                onClick={() => setGenInputMode('paste')}
                className={cn('inline-flex items-center gap-1.5 rounded-md transition-all', genInputMode === 'paste' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
                style={{ height: '32px', padding: '0 12px', fontSize: '13px', fontWeight: 500 }}
              >
                <ClipboardPaste size={13} />
                Paste Text
              </button>
              <button
                onClick={() => setGenInputMode('upload')}
                className={cn('inline-flex items-center gap-1.5 rounded-md transition-all', genInputMode === 'upload' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
                style={{ height: '32px', padding: '0 12px', fontSize: '13px', fontWeight: 500 }}
              >
                <FileUp size={13} />
                Upload File
              </button>
            </div>
          </div>

          {/* Input area */}
          {genInputMode === 'paste' ? (
            <textarea
              value={genPasteText}
              onChange={e => setGenPasteText(e.target.value)}
              placeholder="Paste your project brief, meeting notes, or business context here... (minimum 20 characters)"
              className="w-full rounded-lg bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              style={{
                minHeight: '200px', padding: '12px', fontSize: '13px',
                border: '1px solid hsl(var(--border))', borderRadius: '8px',
                lineHeight: '1.6',
              }}
            />
          ) : (
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleFileDrop}
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors"
              style={{
                minHeight: '200px', padding: '32px',
                borderColor: genFileName ? '#2563EB' : 'hsl(var(--border))',
                background: genFileName ? '#EFF6FF08' : 'transparent',
              }}
            >
              {genFileName ? (
                <>
                  <CheckCircle2 size={32} style={{ color: '#059669', marginBottom: '12px' }} />
                  <p className="font-medium text-foreground" style={{ fontSize: '14px' }}>{genFileName}</p>
                  <button onClick={() => setGenFileName('')} className="text-muted-foreground hover:text-foreground mt-2" style={{ fontSize: '12px' }}>Remove</button>
                </>
              ) : (
                <>
                  <Upload size={32} className="text-muted-foreground" style={{ marginBottom: '12px' }} />
                  <p className="text-foreground" style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                    Drop PDF or DOCX here
                  </p>
                  <p className="text-muted-foreground" style={{ fontSize: '12px', marginBottom: '12px' }}>
                    or click to browse
                  </p>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-md text-white" style={{ height: '32px', padding: '0 12px', fontSize: '13px', fontWeight: 500, background: '#2563EB' }}>
                    Browse Files
                    <input type="file" accept=".pdf,.docx,.doc" className="hidden" onChange={handleFileSelect} />
                  </label>
                </>
              )}
            </div>
          )}

          {/* Generate button */}
          <div className="flex justify-end mt-6">
            <button
              onClick={startGeneration}
              disabled={!canGenerate}
              className={cn(
                'inline-flex items-center gap-2 rounded-[10px] font-semibold text-white transition-all',
                canGenerate ? 'hover:-translate-y-0.5' : 'opacity-50 cursor-not-allowed'
              )}
              style={{ height: '40px', padding: '0 24px', fontSize: '14px', background: '#2563EB', boxShadow: canGenerate ? '0 2px 8px rgba(37,99,235,0.3)' : 'none' }}
            >
              Generate BRD
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // SCREEN 3: THEATER (Extraction Animation)
  // ═══════════════════════════════════════════════════════════════

  function renderTheater() {
    const tpl = TEMPLATES[genTemplate];
    const sections = TEMPLATE_SECTIONS[genTemplate] || [];
    const completedSections = Math.floor((theaterProgress / 100) * sections.length);

    return (
      <div className="flex flex-col h-full" style={{ background: 'linear-gradient(180deg, hsl(var(--background)) 0%, #EFF6FF 100%)' }}>
        {/* Stage — flex column so card fills */}
        <div className="flex-1 flex flex-col items-center justify-center px-6" style={{ minHeight: 0 }}>
          {/* Card — fills stage */}
          <div
            className="w-full flex flex-col rounded-xl border bg-card shadow-lg"
            style={{ maxWidth: '560px', flex: '1 1 auto', minHeight: '380px', maxHeight: '600px', margin: '24px 0' }}
          >
            {/* Card header */}
            <div className="flex-shrink-0 px-6 pt-6 pb-4 text-center" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <div
                className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center mb-3"
                style={{ background: tpl.bg }}
              >
                <Sparkles size={24} style={{ color: tpl.color }} />
              </div>
              <h2 className="font-semibold text-foreground" style={{ fontSize: '18px' }}>
                Generating BRD
              </h2>
              <p className="text-muted-foreground mt-1" style={{ fontSize: '13px' }}>{tpl.name}</p>
            </div>

            {/* Card body — fills remaining space */}
            <div className="flex-1 flex flex-col justify-center px-6 py-6">
              {/* Progress bar — 8px */}
              <div className="w-full rounded-full overflow-hidden" style={{ height: '8px', background: 'hsl(var(--muted))', borderRadius: '4px' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${theaterProgress}%`, background: `linear-gradient(90deg, ${tpl.color}, #2563EB)`, borderRadius: '4px' }}
                />
              </div>

              {/* Percentage */}
              <div className="flex items-center justify-between mt-3">
                <span className="text-muted-foreground" style={{ fontSize: '13px' }}>{theaterStage}</span>
                <span className="font-semibold text-foreground" style={{ fontSize: '14px' }}>
                  {Math.round(theaterProgress)}%
                </span>
              </div>

              {/* Section progress */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Sections
                  </span>
                  <span className="font-mono text-muted-foreground" style={{ fontSize: '11px' }}>
                    {completedSections}/{sections.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {sections.map((s, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded transition-all"
                      style={{
                        height: '20px', padding: '0 6px', fontSize: '10px', fontWeight: 500,
                        background: i < completedSections ? tpl.bg : 'hsl(var(--muted))',
                        color: i < completedSections ? tpl.color : 'hsl(var(--muted-foreground))',
                        opacity: i < completedSections ? 1 : 0.5,
                      }}
                    >
                      {i < completedSections && <CheckCircle2 size={9} className="mr-1" />}
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // SCREEN 4: VIEWER
  // ═══════════════════════════════════════════════════════════════

  function renderViewer(brd: BrdDocument) {
    const tpl = TEMPLATES[brd.template];
    const funcReqs = brd.requirements.filter(r => r.type === 'functional');
    const nfReqs = brd.requirements.filter(r => r.type === 'non-functional');
    const totalStories = brd.epics.reduce((a, e) => a + e.stories.length, 0);

    // Filtered requirements
    const filteredReqs = reqSearch
      ? brd.requirements.filter(r => r.description.toLowerCase().includes(reqSearch.toLowerCase()) || r.code.toLowerCase().includes(reqSearch.toLowerCase()))
      : brd.requirements;

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Top bar */}
        <div className="flex-shrink-0 px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={goLibrary}
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              style={{ fontSize: '13px', fontWeight: 500 }}
            >
              <ChevronLeft size={14} />
              Back to Library
            </button>
            <span style={{ color: 'hsl(var(--border))' }}>|</span>
            <span className="font-mono text-muted-foreground" style={{ fontSize: '11px' }}>{brd.id}</span>
            <span
              className="inline-flex items-center rounded-full"
              style={{ height: '22px', padding: '0 8px', fontSize: '11px', fontWeight: 500, background: tpl.bg, color: tpl.color }}
            >
              {tpl.name}
            </span>
          </div>

          {/* Export bar — sticky */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport(brd)}
              className="inline-flex items-center gap-1.5 rounded-md text-foreground hover:bg-accent/10 transition-colors"
              style={{ height: '32px', padding: '0 12px', fontSize: '13px', fontWeight: 500, border: '1px solid hsl(var(--border))', borderRadius: '6px' }}
            >
              <Download size={13} />
              Export BRD
            </button>
            <button
              onClick={() => handleExportUat(brd)}
              className="inline-flex items-center gap-1.5 rounded-md text-foreground hover:bg-accent/10 transition-colors"
              style={{ height: '32px', padding: '0 12px', fontSize: '13px', fontWeight: 500, border: '1px solid hsl(var(--border))', borderRadius: '6px' }}
            >
              <Download size={13} />
              Export UAT
            </button>
            <button
              onClick={() => handleCopyAll(brd)}
              className="inline-flex items-center gap-1.5 rounded-md text-foreground hover:bg-accent/10 transition-colors"
              style={{ height: '32px', padding: '0 12px', fontSize: '13px', fontWeight: 500, border: '1px solid hsl(var(--border))', borderRadius: '6px' }}
            >
              <Clipboard size={13} />
              Copy All
            </button>
            <button
              onClick={handleJiraPublish}
              className="inline-flex items-center gap-1.5 rounded-md text-white transition-all hover:-translate-y-0.5"
              style={{ height: '32px', padding: '0 12px', fontSize: '13px', fontWeight: 600, background: '#2563EB', borderRadius: '6px' }}
            >
              <ExternalLink size={13} />
              Publish to Jira
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 px-6 flex items-center gap-1" style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--muted) / 0.3)' }}>
          {[
            { key: 'brd' as const, label: 'Full BRD', count: brd.sections.length },
            { key: 'reqs' as const, label: 'Requirements', count: brd.requirements.length },
            { key: 'epics' as const, label: 'Epics & Stories', count: `${brd.epics.length} + ${totalStories}` },
            { key: 'uat' as const, label: 'UAT Cases', count: brd.uatCases.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setViewerTab(tab.key)}
              className={cn('inline-flex items-center gap-2 transition-colors border-b-2', viewerTab === tab.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
              style={{ height: '40px', padding: '0 16px', fontSize: '13px', fontWeight: 500 }}
            >
              {tab.label}
              <span
                className="inline-flex items-center justify-center rounded-full"
                style={{
                  minWidth: '20px', height: '18px', padding: '0 5px',
                  fontSize: '10px', fontWeight: 600,
                  background: viewerTab === tab.key ? '#2563EB' : 'hsl(var(--muted))',
                  color: viewerTab === tab.key ? '#fff' : 'hsl(var(--muted-foreground))',
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-auto">
          {viewerTab === 'brd' && renderBrdTab(brd)}
          {viewerTab === 'reqs' && renderReqsTab(brd, filteredReqs, funcReqs, nfReqs)}
          {viewerTab === 'epics' && renderEpicsTab(brd)}
          {viewerTab === 'uat' && renderUatTab(brd)}
        </div>
      </div>
    );
  }

  function renderBrdTab(brd: BrdDocument) {
    return (
      <div className="flex" style={{ minHeight: '100%' }}>
        {/* TOC sidebar */}
        <div className="flex-shrink-0 overflow-auto border-r" style={{ width: '240px', minWidth: '240px', borderColor: 'hsl(var(--border))', padding: '16px 0' }}>
          <div className="px-4 mb-3" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--muted-foreground))' }}>
            Table of Contents
          </div>
          {brd.sections.map((sec, i) => (
            <button
              key={sec.id}
              onClick={() => {
                document.getElementById(`sec-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="w-full text-left px-4 py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors truncate"
              style={{ fontSize: '12px', lineHeight: '20px' }}
            >
              <span className="font-mono mr-1.5" style={{ fontSize: '10px', opacity: 0.5 }}>{i + 1}.</span>
              {sec.title}
            </button>
          ))}
        </div>

        {/* BRD content */}
        <div className="flex-1 overflow-auto px-8 py-6" style={{ maxWidth: '800px' }}>
          {/* Cover */}
          <div className="mb-8 pb-6" style={{ borderBottom: '2px solid #2563EB' }}>
            <h1 className="font-bold text-foreground" style={{ fontSize: '28px', lineHeight: '36px', marginBottom: '8px' }}>
              {brd.title}
            </h1>
            <div className="flex items-center gap-4 text-muted-foreground" style={{ fontSize: '12px' }}>
              <span>{brd.id}</span>
              <span>·</span>
              <span>{TEMPLATES[brd.template].name}</span>
              <span>·</span>
              <span>{brd.requirements.length} Requirements ({brd.requirements.filter(r => r.type === 'functional').length}F + {brd.requirements.filter(r => r.type === 'non-functional').length}NF)</span>
              <span>·</span>
              <span>{new Date(brd.created).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Sections */}
          {brd.sections.map((sec, i) => (
            <div key={sec.id} id={`sec-${i}`} className="mb-8 group">
              <div className="flex items-start justify-between">
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#2563EB', marginBottom: '8px' }}>
                  {i + 1}. {sec.title}
                </h2>
                <button
                  onClick={() => handleCopySection(sec)}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-all"
                  title="Copy section"
                >
                  <Clipboard size={14} />
                </button>
              </div>
              <p className="text-foreground leading-relaxed" style={{ fontSize: '14px', lineHeight: '1.7' }}>
                {sec.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderReqsTab(brd: BrdDocument, filteredReqs: BrdRequirement[], funcReqs: BrdRequirement[], nfReqs: BrdRequirement[]) {
    return (
      <div className="px-6 py-4">
        {/* Search */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative" style={{ maxWidth: '280px', flex: 1 }}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={reqSearch}
              onChange={e => setReqSearch(e.target.value)}
              placeholder="Search requirements..."
              className="w-full rounded-md bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              style={{ height: '32px', paddingLeft: '32px', paddingRight: '12px', fontSize: '13px', border: '1px solid hsl(var(--border))', borderRadius: '6px' }}
            />
          </div>
          <span className="text-muted-foreground" style={{ fontSize: '12px' }}>
            {filteredReqs.length} of {brd.requirements.length}
          </span>
        </div>

        {/* Reqs table */}
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'hsl(var(--muted))' }}>
              {['CODE', 'TYPE', 'PRIORITY', 'DESCRIPTION'].map(h => (
                <th key={h} className="text-left" style={{ height: '36px', padding: '0 12px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--muted-foreground))', borderBottom: '1px solid hsl(var(--border))' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredReqs.map(req => (
              <tr key={req.id} style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
                <td className="font-mono" style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle', fontSize: '12px', fontWeight: 500, color: '#2563EB' }}>
                  {req.code}
                </td>
                <td style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle' }}>
                  <span className="inline-flex items-center rounded-full" style={{
                    height: '20px', padding: '0 6px', fontSize: '10px', fontWeight: 500,
                    background: req.type === 'functional' ? '#EFF6FF' : '#F5F3FF',
                    color: req.type === 'functional' ? '#2563EB' : '#7C3AED',
                  }}>
                    {req.type === 'functional' ? 'Functional' : 'Non-Functional'}
                  </span>
                </td>
                <td style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle' }}>
                  <span className="inline-flex items-center rounded-full uppercase" style={{
                    height: '20px', padding: '0 6px', fontSize: '10px', fontWeight: 600,
                    background: req.priority === 'must' ? '#FEF2F2' : req.priority === 'should' ? '#FEF3C7' : req.priority === 'could' ? '#ECFDF5' : '#F1F5F9',
                    color: req.priority === 'must' ? '#B91C1C' : req.priority === 'should' ? '#D97706' : req.priority === 'could' ? '#059669' : '#64748B',
                  }}>
                    {req.priority}
                  </span>
                </td>
                <td className="text-foreground" style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle', fontSize: '13px' }}>
                  {req.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderEpicsTab(brd: BrdDocument) {
    if (brd.epics.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle size={28} className="text-muted-foreground mb-3" />
          <p className="text-muted-foreground" style={{ fontSize: '13px' }}>No epics generated for this BRD.</p>
        </div>
      );
    }
    return (
      <div className="px-6 py-4 space-y-2">
        {brd.epics.map(epic => {
          const isExpanded = expandedEpics.has(epic.id);
          return (
            <div key={epic.id} className="border rounded-lg overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
              <button
                onClick={() => {
                  setExpandedEpics(prev => {
                    const next = new Set(prev);
                    next.has(epic.id) ? next.delete(epic.id) : next.add(epic.id);
                    return next;
                  });
                }}
                className="w-full flex items-center gap-3 px-4 text-left hover:bg-accent/5 transition-colors"
                style={{ height: '44px' }}
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="font-medium text-foreground" style={{ fontSize: '14px' }}>{epic.title}</span>
                <span className="text-muted-foreground ml-auto" style={{ fontSize: '12px' }}>
                  {epic.stories.length} stories · {epic.stories.reduce((a, s) => a + s.points, 0)} pts
                </span>
              </button>
              {isExpanded && (
                <div style={{ borderTop: '1px solid hsl(var(--border))' }}>
                  <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'hsl(var(--muted) / 0.5)' }}>
                        {['ID', 'STORY', 'POINTS', 'PRIORITY'].map(h => (
                          <th key={h} className="text-left" style={{ height: '32px', padding: '0 12px 0 16px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--muted-foreground))' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {epic.stories.map(story => (
                        <tr key={story.id} style={{ borderBottom: '1px solid hsl(var(--border) / 0.3)' }}>
                          <td className="font-mono" style={{ height: '36px', padding: '0 12px 0 16px', fontSize: '11px', color: '#2563EB' }}>{story.id}</td>
                          <td style={{ height: '36px', padding: '0 12px', fontSize: '13px' }}>{story.title}</td>
                          <td className="font-mono" style={{ height: '36px', padding: '0 12px', fontSize: '13px', fontWeight: 600 }}>{story.points}</td>
                          <td style={{ height: '36px', padding: '0 12px' }}>
                            <span className="inline-flex items-center rounded-full capitalize" style={{
                              height: '20px', padding: '0 6px', fontSize: '10px', fontWeight: 500,
                              background: story.priority === 'high' ? '#FEF2F2' : story.priority === 'medium' ? '#FEF3C7' : '#ECFDF5',
                              color: story.priority === 'high' ? '#B91C1C' : story.priority === 'medium' ? '#D97706' : '#059669',
                            }}>
                              {story.priority}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderUatTab(brd: BrdDocument) {
    if (brd.uatCases.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle size={28} className="text-muted-foreground mb-3" />
          <p className="text-muted-foreground" style={{ fontSize: '13px' }}>No UAT cases generated for this BRD.</p>
        </div>
      );
    }
    return (
      <div className="px-6 py-4">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'hsl(var(--muted))' }}>
              {['ID', 'SCENARIO', 'GIVEN', 'WHEN', 'THEN', 'PRIORITY'].map(h => (
                <th key={h} className="text-left" style={{ height: '36px', padding: '0 12px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--muted-foreground))', borderBottom: '1px solid hsl(var(--border))' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {brd.uatCases.map(uat => (
              <tr key={uat.id} style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
                <td className="font-mono" style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle', fontSize: '11px', color: '#2563EB', whiteSpace: 'nowrap' }}>{uat.id}</td>
                <td style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle', fontSize: '13px', maxWidth: '200px' }}>
                  <span className="truncate block">{uat.scenario}</span>
                </td>
                <td className="text-muted-foreground" style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle', fontSize: '12px', maxWidth: '180px' }}>
                  <span className="truncate block">{uat.given}</span>
                </td>
                <td className="text-muted-foreground" style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle', fontSize: '12px', maxWidth: '180px' }}>
                  <span className="truncate block">{uat.when}</span>
                </td>
                <td className="text-muted-foreground" style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle', fontSize: '12px', maxWidth: '180px' }}>
                  <span className="truncate block">{uat.then}</span>
                </td>
                <td style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle' }}>
                  <span className="inline-flex items-center rounded-full capitalize" style={{
                    height: '20px', padding: '0 6px', fontSize: '10px', fontWeight: 500,
                    background: uat.priority === 'high' ? '#FEF2F2' : uat.priority === 'medium' ? '#FEF3C7' : '#ECFDF5',
                    color: uat.priority === 'high' ? '#B91C1C' : uat.priority === 'medium' ? '#D97706' : uat.priority === 'low' ? '#059669' : '#64748B',
                  }}>
                    {uat.priority}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
}
