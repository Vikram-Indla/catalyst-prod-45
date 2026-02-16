/**
 * ReqFlow AI — BRD Generation Module (ProductHub)
 * 4-Screen Architecture: Library → Generate → Theater → Viewer
 * CATALYST10 Design System — Complete Rebuild
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  FileText, Search, Trash2, Eye, Copy, Download, ChevronLeft,
  Sparkles, Upload, FileUp, ClipboardPaste, CheckCircle2, ArrowRight,
  ChevronDown, ChevronRight, Clipboard, ExternalLink, SortAsc, SortDesc,
  AlertCircle, X, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface BrdEntry {
  id: string;
  title: string;
  tpl: number;
  lang: string;
  created: string;
  reqs: number;
  epics: number;
  stories: number;
  uatCount: number;
  coverage: number;
}

interface BrdDocument {
  id: string;
  title: string;
  template: number;
  language: string;
  sections: { id: string; title: string; content: string; order: number }[];
  requirements: { id: string; code: string; type: 'functional' | 'non-functional'; priority: 'must' | 'should' | 'could' | 'wont'; description: string; acceptance: string; category?: string }[];
  epics: { id: string; title: string; description: string; stories: { id: string; title: string; points: number; priority: string; acceptance?: string[] }[] }[];
  uatCases: { id: string; scenario: string; given: string; when: string; then: string; priority: 'high' | 'medium' | 'low'; type?: 'positive' | 'negative' }[];
  created: string;
}

interface Template {
  name: string;
  desc: string;
  sections: string[];
}

type Screen = 'library' | 'generate' | 'theater' | 'viewer';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS — 6 Research-Backed Templates
// ═══════════════════════════════════════════════════════════════

const TEMPLATES: Template[] = [
  { name: 'IIBA / BABOK V3', desc: 'Industry standard · 18 sections', sections: [
    '§1 Executive Summary','§2 Business Context','§3 Stakeholder Analysis',
    '§4 Current State','§5 Future State','§6 Business Requirements',
    '§7 Stakeholder Requirements','§8 Functional Requirements',
    '§9 Data Requirements','§10 Non-Functional Requirements',
    '§11 Interface & Integration','§12 Business Rules',
    '§13 User Journeys','§14 Reporting & Analytics',
    '§15 Assumptions & Constraints','§16 Risk Assessment',
    '§17 Implementation Roadmap','§18 Traceability & Appendices'] },
  { name: 'McKinsey / MBB', desc: 'C-suite SCR · 14 sections', sections: [
    '§1 Strategic Recommendation','§2 Situation Overview',
    '§3 Key Complication','§4 Strategic Resolution',
    '§5 Impact Analysis','§6 Stakeholder Map',
    '§7 Requirements Summary','§8 Investment Case',
    '§9 Risk Matrix','§10 Implementation Phases',
    '§11 Success Metrics','§12 Governance Framework',
    '§13 Next Steps','§14 Appendices'] },
  { name: 'Big 4 / KPMG-Deloitte', desc: 'Audit-grade · 20 sections', sections: [
    '§1 Document Control','§2 Executive Summary','§3 Background & Need',
    '§4 Scope Matrix','§5 Stakeholder RACI','§6 Process Flows',
    '§7 Functional Reqs','§8 Non-Functional Reqs','§9 Data Dictionary',
    '§10 Interface Catalog','§11 Reporting Reqs','§12 Security & Access',
    '§13 Compliance','§14 Business Rules','§15 User Journeys',
    '§16 Transition Reqs','§17 Assumptions','§18 Dependencies',
    '§19 Risk Register','§20 Sign-Off'] },
  { name: 'SAFe 6.0 / Lean', desc: 'Agile hypothesis · 14 sections', sections: [
    '§1 Problem Hypothesis','§2 Lean Business Case','§3 Solution Intent',
    '§4 Feature Breakdown','§5 MVP Scope','§6 User Personas',
    '§7 Acceptance Criteria','§8 Non-Functional Reqs',
    '§9 Architectural Runway','§10 Team Topology',
    '§11 Definition of Done','§12 Metrics',
    '§13 Risks & Dependencies','§14 Appendices'] },
  { name: 'Accenture / SI', desc: 'Technical BRD · 16 sections', sections: [
    '§1 Executive Summary','§2 Business Context','§3 Process Decomposition',
    '§4 Use Case Catalog','§5 Functional Specs','§6 Data Dictionary & ER',
    '§7 Interface Catalog','§8 Security Matrix','§9 Performance & Scale',
    '§10 Deployment Architecture','§11 Migration Strategy',
    '§12 Test Strategy','§13 Training & Change',
    '§14 Support Model','§15 Risk Register','§16 Glossary'] },
  { name: 'Government / Public Sector', desc: 'Bilingual · 18 sections', sections: [
    '§1 Executive Summary','§2 Mandate Reference','§3 Strategic Alignment',
    '§4 Stakeholder Hierarchy','§5 Legacy Assessment','§6 Digital Service',
    '§7 Functional Requirements','§8 Data Sovereignty','§9 NCA & PDPL',
    '§10 Government APIs','§11 Accessibility & RTL','§12 Business Regulations',
    '§13 Citizen Journeys','§14 Ministerial Dashboards',
    '§15 Security Classification','§16 Compliance Matrix',
    '§17 Phased Implementation','§18 Appendices'] },
];

const TPL_COLORS = [
  { bg: '#EFF6FF', color: '#2563EB' },
  { bg: '#F5F3FF', color: '#7C3AED' },
  { bg: '#FEF3C7', color: '#D97706' },
  { bg: '#ECFDF5', color: '#059669' },
  { bg: '#FFF7ED', color: '#C2410C' },
  { bg: '#FEF2F2', color: '#B91C1C' },
];

const LANGUAGES = ['Bilingual (AR+EN)', 'English', 'Arabic'];
const LS_KEY = 'reqflow_history';
const LS_DOC_KEY = 'reqflow_docs';

// ═══════════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════════

function loadHistory(): BrdEntry[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function saveHistory(h: BrdEntry[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(h.slice(0, 50)));
}
function loadDocs(): Record<string, BrdDocument> {
  try { return JSON.parse(localStorage.getItem(LS_DOC_KEY) || '{}'); } catch { return {}; }
}
function saveDocs(d: Record<string, BrdDocument>) {
  localStorage.setItem(LS_DOC_KEY, JSON.stringify(d));
}

function nextBrdId(h: BrdEntry[]): string {
  const max = h.reduce((m, b) => Math.max(m, parseInt(b.id.replace('BRD-', ''))), 0);
  return 'BRD-' + String(max + 1).padStart(3, '0');
}

function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 60000;
  if (d < 1) return 'just now';
  if (d < 60) return Math.floor(d) + 'm ago';
  if (d < 1440) return Math.floor(d / 60) + 'h ago';
  if (d < 10080) return Math.floor(d / 1440) + 'd ago';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ═══════════════════════════════════════════════════════════════
// MOCK BRD GENERATOR
// ═══════════════════════════════════════════════════════════════

function generateMockBrd(tplIdx: number, lang: string, history: BrdEntry[]): { entry: BrdEntry; doc: BrdDocument } {
  const tpl = TEMPLATES[tplIdx];
  const id = nextBrdId(history);
  const now = new Date().toISOString();

  const sections = tpl.sections.map((title, i) => ({
    id: `sec-${i}`,
    title: title.replace(/^§\d+\s+/, ''),
    content: `This section covers ${title.replace(/^§\d+\s+/, '').toLowerCase()} for the project. Detailed analysis and recommendations are provided based on the ${tpl.name} methodology framework. Key considerations include stakeholder alignment, technical feasibility, and organizational readiness.`,
    order: i,
  }));

  const CATEGORIES = ['User Interface', 'Data Processing', 'Security', 'Integration', 'Performance', 'Reporting', 'Workflow', 'Compliance'];
  const funcCount = Math.floor(Math.random() * 15) + 20;
  const nfCount = Math.floor(Math.random() * 8) + 8;
  const requirements = [
    ...Array.from({ length: funcCount }, (_, i) => ({
      id: `FR-${String(i + 1).padStart(3, '0')}`,
      code: `FR-${String(i + 1).padStart(3, '0')}`,
      type: 'functional' as const,
      priority: (['must', 'should', 'could', 'wont'] as const)[Math.floor(Math.random() * 3)],
      description: `The system shall provide capability ${i + 1} as defined in the business requirements specification.`,
      acceptance: `Verify that capability ${i + 1} functions correctly under standard and edge-case conditions.`,
      category: CATEGORIES[i % CATEGORIES.length],
    })),
    ...Array.from({ length: nfCount }, (_, i) => ({
      id: `NFR-${String(i + 1).padStart(3, '0')}`,
      code: `NFR-${String(i + 1).padStart(3, '0')}`,
      type: 'non-functional' as const,
      priority: (['must', 'should', 'could'] as const)[Math.floor(Math.random() * 3)],
      description: `The system shall meet non-functional requirement ${i + 1} for performance, security, or scalability.`,
      acceptance: `Measure and validate NFR ${i + 1} against defined thresholds.`,
      category: CATEGORIES[(i + 3) % CATEGORIES.length],
    })),
  ];

  const epicCount = Math.floor(Math.random() * 4) + 8;
  const epics = Array.from({ length: epicCount }, (_, i) => {
    const storyCount = Math.floor(Math.random() * 5) + 3;
    return {
      id: `EPIC-${i + 1}`,
      title: `Epic ${i + 1}: ${['User Management', 'Data Integration', 'Reporting Engine', 'Notification System', 'Workflow Automation', 'Security Module', 'Analytics Dashboard', 'API Gateway', 'Document Management', 'Audit Trail', 'Role Based Access', 'License Processing'][i % 12]}`,
      description: `This epic covers the implementation of major feature area ${i + 1}.`,
      stories: Array.from({ length: storyCount }, (_, j) => ({
        id: `US-${i + 1}.${j + 1}`,
        title: `Story ${j + 1} for Epic ${i + 1}`,
        points: [1, 2, 3, 5, 8, 13][Math.floor(Math.random() * 6)],
        priority: (['high', 'medium', 'low'] as const)[Math.floor(Math.random() * 3)],
        acceptance: [
          `✓ User can perform action ${j + 1} successfully`,
          `✓ System validates all required fields`,
          `✓ Appropriate error messages are displayed for invalid input`,
        ],
      })),
    };
  });

  const totalStories = epics.reduce((a, e) => a + e.stories.length, 0);
  const uatCount = Math.floor(Math.random() * 40) + 30;
  const uatCases = Array.from({ length: uatCount }, (_, i) => ({
    id: `UAT-${String(i + 1).padStart(3, '0')}`,
    scenario: `Scenario ${i + 1}: Validate ${['login', 'data entry', 'report generation', 'notification delivery', 'search functionality', 'export feature', 'permission check', 'workflow trigger'][i % 8]}`,
    given: `Given the user is authenticated and has appropriate permissions`,
    when: `When the user performs the designated action for scenario ${i + 1}`,
    then: `Then the system responds correctly and all acceptance criteria are met`,
    priority: (['high', 'medium', 'low'] as const)[Math.floor(Math.random() * 3)],
    type: (i % 5 === 4 ? 'negative' : 'positive') as 'positive' | 'negative',
  }));

  const entry: BrdEntry = {
    id,
    title: `${tpl.name} Business Requirements Document`,
    tpl: tplIdx,
    lang,
    created: now,
    reqs: requirements.length,
    epics: epicCount,
    stories: totalStories,
    uatCount,
    coverage: Math.floor(Math.random() * 20) + 75,
  };

  const doc: BrdDocument = { id, title: entry.title, template: tplIdx, language: lang, sections, requirements, epics, uatCases, created: now };

  return { entry, doc };
}

// ═══════════════════════════════════════════════════════════════
// THEATER SCENES
// ═══════════════════════════════════════════════════════════════

const THEATER_STAGES = [
  { name: 'Document Analysis', scenes: ['Parsing input document...', 'Extracting key themes...', 'Identifying stakeholders...'] },
  { name: 'Requirements Extraction', scenes: ['Mapping functional requirements...', 'Classifying non-functional requirements...', 'Building traceability matrix...'] },
  { name: 'Architecture Mapping', scenes: ['Generating epic hierarchy...', 'Decomposing user stories...', 'Estimating story points...'] },
  { name: 'Document Assembly', scenes: ['Composing BRD sections...', 'Generating UAT scenarios...', 'Finalizing document...'] },
];

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ReqFlowAIPage() {
  // Screen state
  const [currentScreen, setScreen] = useState<Screen>('library');

  // Library state
  const [history, setHistory] = useState<BrdEntry[]>(loadHistory);
  const [docs, setDocs] = useState<Record<string, BrdDocument>>(loadDocs);
  const [searchQuery, setSearch] = useState('');
  const [filterTpl, setFilterTpl] = useState<number | 'all'>('all');
  const [sortCol, setSortCol] = useState<'id' | 'title' | 'date'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Generate state
  const [selectedTpl, setTpl] = useState(0);
  const [selectedLang, setLang] = useState('Bilingual (AR+EN)');
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('paste');
  const [pasteText, setPasteText] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');

  // Theater state
  const [theaterProgress, setTheaterProgress] = useState(0);
  const [theaterScene, setTheaterScene] = useState('');
  const [theaterStageIdx, setTheaterStageIdx] = useState(0);
  const theaterTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [theaterStartTime, setTheaterStartTime] = useState(0);

  // Viewer state
  const [currentBrdId, setCurrentBrdId] = useState('');
  const [activeTab, setActiveTab] = useState<'brd' | 'reqs' | 'epics' | 'uat'>('brd');
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
  const [reqSearch, setReqSearch] = useState('');
  const [reqSortCol, setReqSortCol] = useState<'code' | 'type' | 'priority' | 'description'>('code');
  const [reqSortDir, setReqSortDir] = useState<'asc' | 'desc'>('asc');
  const [showJiraModal, setShowJiraModal] = useState(false);
  const [jiraKey, setJiraKey] = useState('');
  const [jiraPublishing, setJiraPublishing] = useState(false);
  // Persist
  useEffect(() => { saveHistory(history); }, [history]);
  useEffect(() => { saveDocs(docs); }, [docs]);

  // Derived
  const stats = useMemo(() => ({
    total: history.length,
    reqs: history.reduce((s, b) => s + b.reqs, 0),
    uat: history.reduce((s, b) => s + (b.uatCount || 0), 0),
    coverage: history.length ? Math.round(history.reduce((s, b) => s + (b.coverage || 0), 0) / history.length) : 0,
  }), [history]);

  const filteredHistory = useMemo(() => {
    let r = [...history];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      r = r.filter(b => (b.id + ' ' + b.title + ' ' + TEMPLATES[b.tpl]?.name).toLowerCase().includes(q));
    }
    if (filterTpl !== 'all') r = r.filter(b => b.tpl === filterTpl);
    r.sort((a, b) => {
      let va: any, vb: any;
      if (sortCol === 'date') { va = new Date(a.created).getTime(); vb = new Date(b.created).getTime(); }
      else if (sortCol === 'id') { va = parseInt(a.id.replace('BRD-', '')); vb = parseInt(b.id.replace('BRD-', '')); }
      else { va = a.title.toLowerCase(); vb = b.title.toLowerCase(); }
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return r;
  }, [history, searchQuery, filterTpl, sortCol, sortDir]);

  const currentDoc = docs[currentBrdId] || null;
  const currentEntry = history.find(b => b.id === currentBrdId) || null;

  // ─── Keyboard shortcuts ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/' && currentScreen === 'library') {
        e.preventDefault();
        document.getElementById('reqflow-search')?.focus();
      }
      if (e.key === 'n' && currentScreen === 'library') {
        e.preventDefault();
        goGenerate();
      }
      if (e.key === 'Escape' && currentScreen !== 'library') {
        setScreen('library');
      }
      if (currentScreen === 'viewer' && ['1', '2', '3', '4'].includes(e.key)) {
        setActiveTab(['brd', 'reqs', 'epics', 'uat'][parseInt(e.key) - 1] as any);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentScreen]);

  // ─── Navigation ──────────────────────────────────────────────
  const goGenerate = useCallback(() => {
    setScreen('generate');
    setPasteText('');
    setUploadFileName('');
  }, []);

  const goViewer = useCallback((id: string) => {
    setCurrentBrdId(id);
    setActiveTab('brd');
    setExpandedEpics(new Set());
    setReqSearch('');
    setScreen('viewer');
  }, []);

  // ─── CRUD ────────────────────────────────────────────────────
  const handleRename = useCallback((id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setHistory(prev => prev.map(b => b.id === id ? { ...b, title: newTitle.trim() } : b));
  }, []);

  const handleDuplicate = useCallback((entry: BrdEntry) => {
    const dup: BrdEntry = JSON.parse(JSON.stringify(entry));
    dup.id = nextBrdId(history);
    dup.title = entry.title + ' (Copy)';
    dup.created = new Date().toISOString();
    setHistory(prev => [dup, ...prev]);
    // Also dup doc if exists
    const srcDoc = docs[entry.id];
    if (srcDoc) {
      const dupDoc: BrdDocument = JSON.parse(JSON.stringify(srcDoc));
      dupDoc.id = dup.id;
      dupDoc.title = dup.title;
      dupDoc.created = dup.created;
      setDocs(prev => ({ ...prev, [dup.id]: dupDoc }));
    }
    showToast('success', `⧉ Duplicated as ${dup.id}`);
  }, [history, docs]);

  const handleDelete = useCallback((id: string) => {
    if (!window.confirm('Delete this BRD? This cannot be undone.')) return;
    setHistory(prev => prev.filter(b => b.id !== id));
    setDocs(prev => { const n = { ...prev }; delete n[id]; return n; });
    showToast('success', 'BRD deleted');
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedRows.size === 0) return;
    if (!window.confirm(`Delete ${selectedRows.size} BRD(s)?`)) return;
    setHistory(prev => prev.filter(b => !selectedRows.has(b.id)));
    setDocs(prev => { const n = { ...prev }; selectedRows.forEach(id => delete n[id]); return n; });
    showToast('success', `${selectedRows.size} BRD(s) deleted`);
    setSelectedRows(new Set());
  }, [selectedRows]);

  const handleExport = useCallback((doc: BrdDocument, brdOnly?: boolean) => {
    const secs = TEMPLATES[doc.template]?.sections || [];
    const tpl = TEMPLATES[doc.template];
    const tplC = TPL_COLORS[doc.template] || TPL_COLORS[0];
    const funcReqs = doc.requirements.filter(r => r.type === 'functional');
    const nfReqs = doc.requirements.filter(r => r.type === 'non-functional');
    const totalStories = doc.epics.reduce((a, e) => a + e.stories.length, 0);
    const dateStr = new Date(doc.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const reqsTable = brdOnly ? '' : `
      <h2 style="color:${tplC.color};margin-top:48px;page-break-before:always">Requirements Traceability Matrix</h2>
      <table class="brd-tbl"><thead><tr><th>ID</th><th>Type</th><th>Priority</th><th>Description</th></tr></thead><tbody>
      ${doc.requirements.map(r => `<tr><td style="font-family:'JetBrains Mono',monospace;color:#2563EB;font-weight:600">${r.code}</td><td>${r.type === 'functional' ? 'FUNC' : 'NFR'}</td><td style="text-transform:uppercase">${r.priority}</td><td>${r.description}</td></tr>`).join('')}
      </tbody></table>`;

    const uatTable = brdOnly ? '' : `
      <h2 style="color:${tplC.color};margin-top:48px;page-break-before:always">UAT Scenarios</h2>
      <table class="brd-tbl"><thead><tr><th>ID</th><th>Scenario</th><th>Given</th><th>When</th><th>Then</th><th>Priority</th></tr></thead><tbody>
      ${doc.uatCases.map(u => `<tr><td style="font-family:'JetBrains Mono',monospace;color:#2563EB;font-weight:600">${u.id}</td><td>${u.scenario}</td><td>${u.given}</td><td>${u.when}</td><td>${u.then}</td><td style="text-transform:uppercase">${u.priority}</td></tr>`).join('')}
      </tbody></table>`;

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${doc.title}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Plus Jakarta Sans',sans-serif;max-width:900px;margin:0 auto;padding:48px;color:#0F172A;font-size:13.5px;line-height:1.75}
      .cover{text-align:center;padding:64px 0 48px;border-bottom:4px solid #2563EB;margin-bottom:48px}
      .cover h1{font-size:36px;font-weight:900;line-height:1.1;margin-bottom:16px}
      .cover .classification{display:inline-block;padding:4px 12px;border-radius:4px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;background:#FEF2F2;color:#991B1B;margin-bottom:24px}
      .meta-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:24px;text-align:left}
      .meta-grid dt{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#94A3B8}
      .meta-grid dd{font-size:14px;font-weight:600;color:#0F172A;margin:0}
      .toc{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:20px 24px;margin-bottom:40px}
      .toc h3{font-size:14px;font-weight:700;margin-bottom:12px;color:#0F172A}
      .toc-item{display:block;font-size:13px;color:#64748B;text-decoration:none;padding:3px 0}
      .toc-item:hover{color:#2563EB}
      h2{font-size:20px;font-weight:800;color:${tplC.color};margin-top:40px;margin-bottom:12px}
      h2 .sec-num{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;background:${tplC.bg};color:${tplC.color};font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;margin-right:8px}
      p{margin-bottom:16px}
      .brd-tbl{width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;margin:16px 0}
      .brd-tbl th{background:#F1F5F9;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#64748B;padding:8px 12px;text-align:left}
      .brd-tbl td{padding:8px 12px;font-size:13px;border-bottom:1px solid #F1F5F9}
      .brd-tbl tr:hover td{background:#F8FAFC}
      .approval{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:48px;page-break-before:always}
      .approval-box{border:2px dashed #E2E8F0;border-radius:8px;padding:20px;background:#F8FAFC}
      .approval-box h4{font-size:12px;font-weight:700;color:#334155;margin-bottom:16px}
      .approval-box .sig-line{border-bottom:1px solid #94A3B8;height:32px;margin-bottom:8px}
      .approval-box .sig-label{font-size:10px;color:#94A3B8}
      .footer{margin-top:48px;padding-top:16px;border-top:1px solid #E2E8F0;font-size:11px;color:#94A3B8;text-align:center}
      @media print{body{padding:24px}.cover{page-break-after:always}h2{page-break-after:avoid}}
    </style></head><body>
    <div class="cover">
      <div class="classification">CONFIDENTIAL — Government Use Only</div>
      <h1>${doc.title}</h1>
      <dl class="meta-grid">
        <div><dt>Document ID</dt><dd>${doc.id}</dd></div>
        <div><dt>Template</dt><dd>${tpl.name}</dd></div>
        <div><dt>Language</dt><dd>${doc.language}</dd></div>
        <div><dt>Date</dt><dd>${dateStr}</dd></div>
        <div><dt>Requirements</dt><dd>${doc.requirements.length} (${funcReqs.length}F + ${nfReqs.length}NF)</dd></div>
        <div><dt>UAT Coverage</dt><dd>${doc.uatCases.length} scenarios</dd></div>
      </dl>
    </div>
    <div class="toc">
      <h3>Table of Contents</h3>
      ${secs.map((s, i) => `<a class="toc-item" href="#sec-${i}">${s}</a>`).join('')}
    </div>
    ${doc.sections.map((s, i) => `<h2 id="sec-${i}"><span class="sec-num">${i + 1}</span>${secs[i] || s.title}</h2><p>${s.content}</p>`).join('')}
    ${reqsTable}
    ${uatTable}
    <div class="approval">
      ${['Prepared By', 'Reviewed By', 'Approved By', 'Accepted By'].map(role => `<div class="approval-box"><h4>${role}</h4><div class="sig-line"></div><div class="sig-label">Name & Signature</div><div style="margin-top:12px"><div class="sig-line"></div><div class="sig-label">Date</div></div></div>`).join('')}
    </div>
    <div class="footer">${doc.id} · ${tpl.name} · ${dateStr} · Generated by ReqFlow AI</div>
    </body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${doc.id}_BRD.html`;
    a.click();
    showToast('success', brdOnly ? 'BRD-only exported as HTML' : 'Full BRD exported as HTML');
  }, []);

  const handleExportUat = useCallback((doc: BrdDocument) => {
    const header = 'ID\tScenario\tGiven\tWhen\tThen\tPriority\n';
    const rows = doc.uatCases.map(u => `${u.id}\t${u.scenario}\t${u.given}\t${u.when}\t${u.then}\t${u.priority}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${doc.id}_UAT.csv`;
    a.click();
    showToast('success', 'UAT exported as CSV');
  }, []);

  const handleCopyAll = useCallback((doc: BrdDocument) => {
    navigator.clipboard.writeText(doc.sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n'));
    showToast('success', 'BRD copied to clipboard');
  }, []);

  const handleCopySection = useCallback((sec: { title: string; content: string }) => {
    navigator.clipboard.writeText(`## ${sec.title}\n\n${sec.content}`);
    showToast('success', `"${sec.title}" copied`);
  }, []);

  // ─── Generate flow ───────────────────────────────────────────
  const canGenerate = inputMode === 'upload' ? !!uploadFileName : pasteText.trim().length >= 50;

  const startGeneration = useCallback(() => {
    setScreen('theater');
    setTheaterProgress(0);
    setTheaterStageIdx(0);
    setTheaterScene(THEATER_STAGES[0].scenes[0]);
    setTheaterStartTime(Date.now());

    let progress = 0;
    let sceneIdx = 0;
    const allScenes = THEATER_STAGES.flatMap(s => s.scenes);

    theaterTimer.current = setInterval(() => {
      progress += Math.random() * 3 + 1.5;
      if (progress >= 100) {
        progress = 100;
        if (theaterTimer.current) clearInterval(theaterTimer.current);

        const { entry, doc } = generateMockBrd(selectedTpl, selectedLang, history);
        setHistory(prev => [entry, ...prev]);
        setDocs(prev => ({ ...prev, [entry.id]: doc }));

        setTimeout(() => {
          goViewer(entry.id);
          showToast('success', `✨ ${entry.id} generated — ${entry.reqs} requirements extracted`);
        }, 600);
      }

      const newSceneIdx = Math.min(Math.floor((progress / 100) * allScenes.length), allScenes.length - 1);
      if (newSceneIdx !== sceneIdx) {
        sceneIdx = newSceneIdx;
        setTheaterScene(allScenes[sceneIdx]);
      }

      // Determine stage
      let cumScenes = 0;
      for (let i = 0; i < THEATER_STAGES.length; i++) {
        cumScenes += THEATER_STAGES[i].scenes.length;
        if (sceneIdx < cumScenes) { setTheaterStageIdx(i); break; }
      }

      setTheaterProgress(Math.min(progress, 100));
    }, 250);
  }, [selectedTpl, selectedLang, history, goViewer]);

  useEffect(() => {
    return () => { if (theaterTimer.current) clearInterval(theaterTimer.current); };
  }, []);

  // ─── Sort toggle ─────────────────────────────────────────────
  const toggleSort = useCallback((col: 'id' | 'title' | 'date') => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }, [sortCol]);

  // ─── Toast helper ────────────────────────────────────────────
  function showToast(type: 'success' | 'error' | 'info', msg: string) {
    toast[type](msg);
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#F8FAFC', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {currentScreen === 'library' && <LibraryScreen />}
      {currentScreen === 'generate' && <GenerateScreen />}
      {currentScreen === 'theater' && <TheaterScreen />}
      {currentScreen === 'viewer' && currentDoc && <ViewerScreen />}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // SCREEN 1: LIBRARY
  // ═══════════════════════════════════════════════════════════════

  function LibraryScreen() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ flexShrink: 0, padding: '20px 24px 16px', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.2, color: '#0F172A', margin: 0 }}>ReqFlow AI</h2>
              <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>AI-powered Business Requirements Document generator</p>
            </div>
            <button
              onClick={goGenerate}
              style={{ height: '36px', padding: '0 16px', fontSize: '13px', fontWeight: 600, color: '#FFF', background: '#2563EB', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 3px rgba(37,99,235,0.3)' }}
            >
              <Sparkles size={14} />
              ✨ Generate New BRD
            </button>
          </div>

          {/* Stats strip */}
          <div style={{ display: 'flex', gap: '24px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 24px' }}>
            {[
              { icon: '📊', label: 'TOTAL BRDS', value: stats.total },
              { icon: '📋', label: 'REQUIREMENTS', value: stats.reqs },
              { icon: '🧪', label: 'UAT SCENARIOS', value: stats.uat },
              { icon: '📈', label: 'AVG COVERAGE', value: stats.coverage + '%' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.6px', marginBottom: '4px' }}>{s.icon} {s.label}</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ flexShrink: 0, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ position: 'relative', minWidth: '240px', flex: '0 1 320px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              id="reqflow-search"
              type="text"
              value={searchQuery}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search BRDs...  ( / )"
              style={{ width: '100%', height: '36px', paddingLeft: '32px', paddingRight: '12px', fontSize: '13px', border: '1px solid #E2E8F0', borderRadius: '6px', outline: 'none', background: 'transparent', color: '#0F172A' }}
              onFocus={e => (e.target.style.borderColor = '#2563EB')}
              onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <select
              value={filterTpl === 'all' ? 'all' : filterTpl}
              onChange={e => setFilterTpl(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              style={{ height: '36px', padding: '0 28px 0 12px', fontSize: '13px', fontWeight: 500, border: '1px solid #E2E8F0', borderRadius: '6px', outline: 'none', appearance: 'none', background: 'transparent', cursor: 'pointer', color: '#0F172A' }}
            >
              <option value="all">All Templates</option>
              {TEMPLATES.map((t, i) => <option key={i} value={i}>{t.name}</option>)}
            </select>
            <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94A3B8' }} />
          </div>

          {selectedRows.size > 0 && (
            <>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>{selectedRows.size} selected</span>
              <button
                onClick={handleBulkDelete}
                style={{ height: '36px', padding: '0 12px', fontSize: '13px', fontWeight: 500, color: '#EF4444', background: '#FEF2F2', border: '1px solid #EF4444', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={13} />
                Delete Selected
              </button>
            </>
          )}
        </div>

        {/* Table */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {filteredHistory.length === 0 ? (
            history.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <FileText size={28} style={{ color: '#2563EB' }} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>📄 No BRDs generated yet</h3>
                <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '360px', marginBottom: '20px' }}>Generate your first Business Requirements Document using AI-powered analysis.</p>
                <button
                  onClick={goGenerate}
                  style={{ height: '36px', padding: '0 16px', fontSize: '13px', fontWeight: 600, color: '#FFF', background: '#2563EB', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Sparkles size={14} />
                  Generate New BRD
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center' }}>
                <Search size={20} style={{ color: '#94A3B8', marginBottom: '12px' }} />
                <p style={{ fontSize: '13px', color: '#64748B' }}>No BRDs match your search</p>
              </div>
            )
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  <th style={{ width: '36px', height: '36px', padding: '0 12px', borderBottom: '2px solid #E2E8F0' }}>
                    <input
                      type="checkbox"
                      checked={selectedRows.size === filteredHistory.length && filteredHistory.length > 0}
                      onChange={() => {
                        if (selectedRows.size === filteredHistory.length) setSelectedRows(new Set());
                        else setSelectedRows(new Set(filteredHistory.map(b => b.id)));
                      }}
                      style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                    />
                  </th>
                  {[
                    { col: 'id' as const, label: 'ID', w: '80px' },
                    { col: 'title' as const, label: 'TITLE', w: undefined },
                    { col: null, label: 'TEMPLATE', w: '160px' },
                    { col: null, label: 'STATS', w: '120px' },
                    { col: null, label: 'UAT', w: '80px' },
                    { col: 'date' as const, label: 'DATE', w: '100px' },
                    { col: null, label: 'ACTIONS', w: '120px' },
                  ].map((h, i) => (
                    <th
                      key={h.label}
                      onClick={h.col ? () => toggleSort(h.col!) : undefined}
                      style={{
                        height: '36px', padding: '0 12px', textAlign: 'left',
                        fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.6px',
                        color: '#94A3B8', borderBottom: '2px solid #E2E8F0',
                        width: h.w, cursor: h.col ? 'pointer' : undefined, userSelect: 'none',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {h.label}
                        {h.col && sortCol === h.col && (sortDir === 'asc' ? <SortAsc size={10} /> : <SortDesc size={10} />)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map(entry => {
                  const tplC = TPL_COLORS[entry.tpl] || TPL_COLORS[0];
                  return (
                    <tr
                      key={entry.id}
                      onClick={() => goViewer(entry.id)}
                      style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', height: '36px' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Checkbox */}
                      <td
                        onClick={e => e.stopPropagation()}
                        style={{ width: '36px', height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle' }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedRows.has(entry.id)}
                          onChange={() => {
                            setSelectedRows(prev => {
                              const n = new Set(prev);
                              n.has(entry.id) ? n.delete(entry.id) : n.add(entry.id);
                              return n;
                            });
                          }}
                          style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                        />
                      </td>

                      {/* ID */}
                      <td style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle', fontSize: '11px', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: '#2563EB' }}>
                        {entry.id}
                      </td>

                      {/* Title — stopPropagation */}
                      <td
                        onClick={e => e.stopPropagation()}
                        style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle' }}
                      >
                        <input
                          type="text"
                          defaultValue={entry.title}
                          onBlur={e => handleRename(entry.id, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                          onClick={e => e.stopPropagation()}
                          onFocus={e => (e.target.style.borderBottom = '1px dashed #2563EB')}
                          style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px dashed transparent', outline: 'none', fontSize: '13.5px', fontWeight: 500, color: '#0F172A', padding: '0', height: '28px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        />
                      </td>

                      {/* Template badge */}
                      <td style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', height: '22px', padding: '0 8px', borderRadius: '11px', fontSize: '11px', fontWeight: 500, background: tplC.bg, color: tplC.color }}>
                          {TEMPLATES[entry.tpl]?.name || 'Unknown'}
                        </span>
                      </td>

                      {/* Stats */}
                      <td style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle', fontSize: '11px', fontWeight: 400, color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>
                        {entry.reqs}r · {entry.epics}e · {entry.stories}s
                      </td>

                      {/* UAT */}
                      <td style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle', fontSize: '11px', fontWeight: 400, color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>
                        {entry.uatCount} · {entry.coverage}%
                      </td>

                      {/* Date */}
                      <td style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle', fontSize: '13px', color: '#64748B' }}>
                        {timeAgo(entry.created)}
                      </td>

                      {/* Actions — stopPropagation */}
                      <td
                        onClick={e => e.stopPropagation()}
                        style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <ActionBtn icon={<Eye size={14} />} title="View" onClick={() => goViewer(entry.id)} />
                          <ActionBtn icon={<Copy size={14} />} title="Duplicate" onClick={() => handleDuplicate(entry)} />
                          <ActionBtn icon={<Download size={14} />} title="Export" onClick={() => { const d = docs[entry.id]; if (d) handleExport(d); }} />
                          <ActionBtn icon={<Trash2 size={14} />} title="Delete" onClick={() => handleDelete(entry.id)} danger />
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

  function GenerateScreen() {
    const tpl = TEMPLATES[selectedTpl];
    const tplC = TPL_COLORS[selectedTpl];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ flexShrink: 0, padding: '12px 24px', borderBottom: '1px solid #E2E8F0' }}>
          <button
            onClick={() => setScreen('library')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 500, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <ChevronLeft size={14} /> ← Back to Library
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>Generate New BRD</h2>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '24px' }}>Select a template methodology and provide your source document or text.</p>

            {/* Template select */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#0F172A', marginBottom: '8px' }}>Template Methodology</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedTpl}
                  onChange={e => setTpl(Number(e.target.value))}
                  style={{ width: '100%', height: '36px', padding: '0 28px 0 12px', fontSize: '13px', border: '1px solid #E2E8F0', borderRadius: '6px', outline: 'none', appearance: 'none', background: '#FFF', cursor: 'pointer', color: '#0F172A' }}
                >
                  {TEMPLATES.map((t, i) => <option key={i} value={i}>{t.name} — {t.desc}</option>)}
                </select>
                <ChevronDown size={12} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94A3B8' }} />
              </div>
            </div>

            {/* Section chips */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94A3B8', marginBottom: '6px' }}>
                Sections ({tpl.sections.length})
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {tpl.sections.map((s, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', height: '22px', padding: '0 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 400, background: tplC.bg, color: tplC.color }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Language */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#0F172A', marginBottom: '8px' }}>Language</label>
              <div style={{ position: 'relative', maxWidth: '220px' }}>
                <select
                  value={selectedLang}
                  onChange={e => setLang(e.target.value)}
                  style={{ width: '100%', height: '36px', padding: '0 28px 0 12px', fontSize: '13px', border: '1px solid #E2E8F0', borderRadius: '6px', outline: 'none', appearance: 'none', background: '#FFF', cursor: 'pointer', color: '#0F172A' }}
                >
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <ChevronDown size={12} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94A3B8' }} />
              </div>
            </div>

            {/* Input mode tabs */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#0F172A', marginBottom: '8px' }}>Input Source</label>
              <div style={{ display: 'inline-flex', borderRadius: '8px', padding: '2px', background: '#F1F5F9', gap: '2px' }}>
                {(['paste', 'upload'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setInputMode(mode)}
                    style={{
                      height: '32px', padding: '0 12px', fontSize: '13px', fontWeight: 500, borderRadius: '6px', border: 'none', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      background: inputMode === mode ? '#FFF' : 'transparent',
                      color: inputMode === mode ? '#0F172A' : '#64748B',
                      boxShadow: inputMode === mode ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                    }}
                  >
                    {mode === 'paste' ? <><ClipboardPaste size={13} /> Paste Text</> : <><FileUp size={13} /> Upload File</>}
                  </button>
                ))}
              </div>
            </div>

            {/* Input area */}
            {inputMode === 'paste' ? (
              <div>
                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder="Paste your project brief, meeting notes, or business context here... (minimum 50 characters)"
                  style={{ width: '100%', minHeight: '320px', padding: '12px', fontSize: '14px', lineHeight: 1.8, border: '1px solid #E2E8F0', borderRadius: '8px', outline: 'none', resize: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0F172A', background: '#FFF' }}
                  onFocus={e => (e.target.style.borderColor = '#2563EB')}
                  onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '12px' }}>
                  {pasteText.length >= 50 ? (
                    <><CheckCircle2 size={14} style={{ color: '#10B981' }} /><span style={{ color: '#10B981', fontWeight: 500 }}>✓ {pasteText.length} characters</span></>
                  ) : (
                    <span style={{ color: '#94A3B8' }}>{pasteText.length}/50 characters minimum</span>
                  )}
                </div>
              </div>
            ) : (
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file && (file.name.endsWith('.pdf') || file.name.endsWith('.docx'))) {
                    setUploadFileName(file.name);
                    showToast('success', `File loaded: ${file.name}`);
                  } else {
                    showToast('error', 'Only PDF and DOCX files are supported');
                  }
                }}
                style={{ minHeight: '320px', padding: '32px', border: `2px dashed ${uploadFileName ? '#2563EB' : '#E2E8F0'}`, borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: uploadFileName ? '#EFF6FF08' : '#FFF' }}
              >
                {uploadFileName ? (
                  <>
                    <CheckCircle2 size={32} style={{ color: '#10B981', marginBottom: '12px' }} />
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{uploadFileName}</p>
                    <button onClick={() => setUploadFileName('')} style={{ fontSize: '12px', color: '#64748B', marginTop: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                  </>
                ) : (
                  <>
                    <Upload size={32} style={{ color: '#94A3B8', marginBottom: '12px' }} />
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A', marginBottom: '4px' }}>Drop PDF or DOCX here</p>
                    <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '12px' }}>or click to browse</p>
                    <label style={{ height: '32px', padding: '0 12px', fontSize: '13px', fontWeight: 500, color: '#FFF', background: '#2563EB', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                      Browse Files
                      <input type="file" accept=".pdf,.docx,.doc" style={{ display: 'none' }} onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) { setUploadFileName(file.name); showToast('success', `File loaded: ${file.name}`); }
                      }} />
                    </label>
                  </>
                )}
              </div>
            )}

            {/* Generate button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                onClick={startGeneration}
                disabled={!canGenerate}
                style={{
                  height: '44px', padding: '0 24px', fontSize: '14px', fontWeight: 600, color: '#FFF',
                  background: canGenerate ? '#2563EB' : '#94A3B8', borderRadius: '8px', border: 'none',
                  cursor: canGenerate ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: '8px',
                  boxShadow: canGenerate ? '0 2px 8px rgba(37,99,235,0.3)' : 'none', opacity: canGenerate ? 1 : 0.5,
                }}
              >
                Generate BRD →
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // SCREEN 3: THEATER
  // ═══════════════════════════════════════════════════════════════

  function TheaterScreen() {
    const tplC = TPL_COLORS[selectedTpl];
    const tpl = TEMPLATES[selectedTpl];
    const allScenes = THEATER_STAGES.flatMap(s => s.scenes);
    const completedSections = Math.floor((theaterProgress / 100) * tpl.sections.length);
    const elapsed = Math.floor((Date.now() - theaterStartTime) / 1000);
    const eta = theaterProgress > 5 ? Math.ceil((elapsed / theaterProgress) * (100 - theaterProgress)) : 30;

    // Counters
    const reqsDone = Math.floor((theaterProgress / 100) * 47);
    const epicsDone = Math.floor((theaterProgress / 100) * 12);
    const storiesDone = Math.floor((theaterProgress / 100) * 38);
    const uatDone = Math.floor((theaterProgress / 100) * 65);
    const risksDone = Math.floor((theaterProgress / 100) * 8);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'linear-gradient(180deg, #F8FAFC 0%, #EFF6FF 100%)' }}>
        <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: '20px', padding: '24px' }}>
          {/* Main area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Pipeline */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', marginBottom: '20px' }}>
              {THEATER_STAGES.map((stage, i) => (
                <React.Fragment key={i}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                      background: i < theaterStageIdx ? '#10B981' : i === theaterStageIdx ? '#2563EB' : 'transparent',
                      color: i <= theaterStageIdx ? '#FFF' : '#94A3B8',
                      border: i > theaterStageIdx ? '2px solid #E2E8F0' : 'none',
                    }}>
                      {i < theaterStageIdx ? <Check size={14} /> : i + 1}
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 500, color: i <= theaterStageIdx ? '#0F172A' : '#94A3B8', whiteSpace: 'nowrap' }}>{stage.name}</span>
                  </div>
                  {i < THEATER_STAGES.length - 1 && (
                    <div style={{ width: '48px', height: '2px', background: i < theaterStageIdx ? '#10B981' : '#E2E8F0', margin: '0 8px', marginBottom: '20px' }} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Masthead */}
            <div style={{ flexShrink: 0, textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#2563EB' }}>{Math.round(theaterProgress)}%</div>
              <div style={{ width: '100%', maxWidth: '400px', margin: '8px auto', height: '8px', borderRadius: '4px', background: '#E2E8F0', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: '4px', background: `linear-gradient(90deg, ${tplC.color}, #2563EB)`, width: `${theaterProgress}%`, transition: 'width 300ms' }} />
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                {theaterScene} <span style={{ color: '#94A3B8' }}>· {elapsed}s elapsed · ~{eta}s remaining</span>
              </div>
            </div>

            {/* Stage Card — flex:1, fills remaining space */}
            <div style={{ flex: 1, minHeight: '380px', display: 'flex', flexDirection: 'column', background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
              {/* 5px color stripe */}
              <div style={{ height: '5px', background: `linear-gradient(90deg, ${tplC.color}, #2563EB)`, flexShrink: 0 }} />
              {/* Card body */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', height: '22px', padding: '0 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: tplC.bg, color: tplC.color, marginBottom: '12px', alignSelf: 'flex-start' }}>
                  {THEATER_STAGES[theaterStageIdx]?.name}
                </div>
                <h3 style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>
                  {theaterScene}
                </h3>
                <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.6, maxWidth: '480px' }}>
                  Analyzing document structure and extracting requirements using {tpl.name} methodology framework with <mark style={{ background: '#FEF3C7', padding: '0 2px', borderRadius: '2px' }}>AI-powered semantic analysis</mark>.
                </p>

                {/* Tags */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '16px', flexWrap: 'wrap' }}>
                  {tpl.sections.slice(0, 5).map((s, i) => (
                    <span key={i} style={{ height: '20px', padding: '0 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 500, background: '#F1F5F9', color: '#64748B', display: 'inline-flex', alignItems: 'center' }}>
                      {s.replace(/^§\d+\s+/, '')}
                    </span>
                  ))}
                </div>

                {/* Source footer */}
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #F1F5F9', fontSize: '11px', color: '#94A3B8' }}>
                  Source: {inputMode === 'upload' ? uploadFileName : 'Pasted text'} · {tpl.sections.length} sections · {selectedLang}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Counters */}
            {[
              { label: 'Requirements', count: reqsDone, icon: '📋' },
              { label: 'Epics', count: epicsDone, icon: '🏗' },
              { label: 'Stories', count: storiesDone, icon: '📝' },
              { label: 'UAT Cases', count: uatDone, icon: '🧪' },
              { label: 'Risks', count: risksDone, icon: '⚠️' },
            ].map(c => (
              <div key={c.label} style={{ height: '52px', background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#334155' }}>{c.icon} {c.label}</span>
                <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#0F172A' }}>{c.count}</span>
              </div>
            ))}

            {/* Journey checklist */}
            <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 16px', flex: 1 }}>
              <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94A3B8', marginBottom: '8px' }}>EXTRACTION JOURNEY</div>
              {THEATER_STAGES.map((stage, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '28px' }}>
                  {i < theaterStageIdx ? (
                    <CheckCircle2 size={14} style={{ color: '#10B981', flexShrink: 0 }} />
                  ) : i === theaterStageIdx ? (
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #2563EB', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #E2E8F0', flexShrink: 0 }} />
                  )}
                  <span style={{ fontSize: '12px', fontWeight: i <= theaterStageIdx ? 500 : 400, color: i <= theaterStageIdx ? '#0F172A' : '#94A3B8' }}>{stage.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // SCREEN 4: VIEWER — Professional BRD Document
  // ═══════════════════════════════════════════════════════════════

  function ViewerScreen() {
    const doc = currentDoc!;
    const entry = currentEntry;
    const tplC = TPL_COLORS[doc.template] || TPL_COLORS[0];
    const tpl = TEMPLATES[doc.template];
    const funcReqs = doc.requirements.filter(r => r.type === 'functional');
    const nfReqs = doc.requirements.filter(r => r.type === 'non-functional');
    const totalStories = doc.epics.reduce((a, e) => a + e.stories.length, 0);
    const dateStr = new Date(doc.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const uatCoverage = entry ? entry.coverage : Math.round((doc.uatCases.length / Math.max(doc.requirements.length, 1)) * 100);
    const uatDisplayLimit = 50;

    // Sort + filter requirements
    const filteredReqs = useMemo(() => {
      let r = [...doc.requirements];
      if (reqSearch) {
        const q = reqSearch.toLowerCase();
        r = r.filter(rr => (rr.description + rr.code + rr.priority + (rr.category || '')).toLowerCase().includes(q));
      }
      r.sort((a, b) => {
        const priority = { must: 0, should: 1, could: 2, wont: 3 };
        let va: any, vb: any;
        if (reqSortCol === 'code') { va = a.code; vb = b.code; }
        else if (reqSortCol === 'type') { va = a.type; vb = b.type; }
        else if (reqSortCol === 'priority') { va = priority[a.priority]; vb = priority[b.priority]; }
        else { va = a.description; vb = b.description; }
        return reqSortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
      });
      return r;
    }, [doc.requirements, reqSearch, reqSortCol, reqSortDir]);

    const toggleReqSort = (col: typeof reqSortCol) => {
      if (reqSortCol === col) setReqSortDir(d => d === 'asc' ? 'desc' : 'asc');
      else { setReqSortCol(col); setReqSortDir('asc'); }
    };

    const handleJiraPublish = () => {
      if (!/^[A-Z0-9]{2,10}$/.test(jiraKey)) {
        showToast('error', 'Project key must be 2-10 uppercase alphanumeric characters');
        return;
      }
      setJiraPublishing(true);
      setTimeout(() => {
        setJiraPublishing(false);
        setShowJiraModal(false);
        setJiraKey('');
        showToast('success', `✅ Published ${doc.requirements.length} requirements to ${jiraKey}`);
      }, 1500);
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>
        {/* Viewer Header */}
        <div style={{ flexShrink: 0, padding: '12px 24px', borderBottom: '1px solid #E2E8F0', background: '#FFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <button
              onClick={() => setScreen('library')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 500, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#2563EB')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
            >
              <ChevronLeft size={14} /> ← Back to Library
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", padding: '3px 10px', borderRadius: '6px', background: '#EFF6FF', color: '#2563EB' }}>
              {doc.id}
            </span>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>{doc.title}</h2>
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', height: '20px', padding: '0 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500, background: tplC.bg, color: tplC.color }}>{tpl.name}</span>
            <span>·</span>
            <span>{doc.language}</span>
            <span>·</span>
            <span>{dateStr}</span>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ flexShrink: 0, padding: '0 24px', display: 'flex', alignItems: 'center', gap: '4px', borderBottom: '1px solid #E2E8F0', background: '#FAFBFC' }}>
          {([
            { key: 'brd' as const, icon: '📄', label: 'Full BRD', count: doc.sections.length },
            { key: 'reqs' as const, icon: '📋', label: 'Requirements', count: doc.requirements.length },
            { key: 'epics' as const, icon: '🎯', label: 'Epics & Stories', count: doc.epics.length + totalStories },
            { key: 'uat' as const, icon: '✅', label: 'UAT', count: doc.uatCases.length },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                height: '40px', padding: '0 16px', fontSize: '13px',
                fontWeight: activeTab === tab.key ? 700 : 500,
                color: activeTab === tab.key ? '#2563EB' : '#64748B',
                background: 'none', border: 'none',
                borderBottom: `2px solid ${activeTab === tab.key ? '#2563EB' : 'transparent'}`,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
              }}
            >
              {tab.icon} {tab.label}
              <span style={{
                fontSize: '9px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                padding: '1px 6px', borderRadius: '10px',
                background: activeTab === tab.key ? '#2563EB' : '#E2E8F0',
                color: activeTab === tab.key ? '#FFF' : '#64748B',
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>

          {/* ──── FULL BRD TAB ──── */}
          {activeTab === 'brd' && (
            <div style={{ display: 'flex', minHeight: '100%' }}>
              {/* TOC sidebar — 240px */}
              <div style={{ width: '240px', minWidth: '240px', flexShrink: 0, borderRight: '1px solid #E2E8F0', padding: '16px 0', position: 'sticky', top: 0, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                <div style={{ padding: '0 16px', marginBottom: '8px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94A3B8' }}>
                  Table of Contents ({doc.sections.length})
                </div>
                {doc.sections.map((sec, i) => (
                  <button
                    key={sec.id}
                    onClick={() => document.getElementById(`brd-sec-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    style={{ width: '100%', textAlign: 'left', padding: '4px 16px', fontSize: '12px', color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', lineHeight: '20px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', opacity: 0.5, marginRight: '6px' }}>{i + 1}.</span>
                    {tpl.sections[i]?.replace(/^§\d+\s+/, '') || sec.title}
                  </button>
                ))}
              </div>

              {/* BRD Document content */}
              <div style={{ flex: 1, padding: '32px 40px', maxWidth: '840px' }}>
                {/* Cover page */}
                <div style={{ textAlign: 'center', paddingBottom: '32px', marginBottom: '40px', borderBottom: '4px solid #2563EB' }}>
                  <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', background: '#FEF2F2', color: '#991B1B', marginBottom: '20px' }}>
                    CONFIDENTIAL — Government Use Only
                  </div>
                  <h1 style={{ fontSize: '36px', fontWeight: 900, lineHeight: 1.1, color: '#0F172A', marginBottom: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {doc.title}
                  </h1>
                  {/* 3×2 metadata grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', textAlign: 'left', marginTop: '24px' }}>
                    {[
                      { label: 'DOCUMENT ID', value: doc.id },
                      { label: 'TEMPLATE', value: tpl.name },
                      { label: 'LANGUAGE', value: doc.language },
                      { label: 'DATE', value: dateStr },
                      { label: 'REQUIREMENTS', value: `${doc.requirements.length} (${funcReqs.length}F + ${nfReqs.length}NF)` },
                      { label: 'UAT COVERAGE', value: `${doc.uatCases.length} scenarios · ${uatCoverage}%` },
                    ].map(m => (
                      <div key={m.label}>
                        <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94A3B8', marginBottom: '4px' }}>{m.label}</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* TOC block inside document */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '20px 24px', marginBottom: '40px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '12px' }}>Table of Contents</h3>
                  {doc.sections.map((sec, i) => (
                    <a
                      key={sec.id}
                      href={`#brd-sec-${i}`}
                      onClick={e => { e.preventDefault(); document.getElementById(`brd-sec-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                      style={{ display: 'block', fontSize: '13px', color: '#64748B', textDecoration: 'none', padding: '3px 0', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#2563EB')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
                    >
                      {tpl.sections[i] || `${i + 1}. ${sec.title}`}
                    </a>
                  ))}
                </div>

                {/* Document sections */}
                {doc.sections.map((sec, i) => (
                  <div key={sec.id} id={`brd-sec-${i}`} style={{ marginBottom: '36px', scrollMarginTop: '60px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: tplC.bg, color: tplC.color, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                          {i + 1}
                        </span>
                        {tpl.sections[i]?.replace(/^§\d+\s+/, '') || sec.title}
                      </h2>
                      <button
                        onClick={() => handleCopySection(sec)}
                        title="Copy section"
                        style={{ padding: '4px', borderRadius: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', opacity: 0.4, flexShrink: 0, marginTop: '4px' }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = '#F1F5F9'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.background = 'none'; }}
                      >
                        <Clipboard size={14} />
                      </button>
                    </div>
                    <p style={{ fontSize: '13.5px', lineHeight: 1.75, color: '#334155', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {sec.content}
                    </p>
                  </div>
                ))}

                {/* Approval block */}
                <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '2px solid #E2E8F0' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>Document Approval</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {['Prepared By', 'Reviewed By', 'Approved By', 'Accepted By'].map(role => (
                      <div key={role} style={{ border: '2px dashed #E2E8F0', borderRadius: '8px', padding: '20px', background: '#F8FAFC' }}>
                        <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '16px' }}>{role}</h4>
                        <div style={{ borderBottom: '1px solid #94A3B8', height: '32px', marginBottom: '8px' }} />
                        <div style={{ fontSize: '10px', color: '#94A3B8' }}>Name & Signature</div>
                        <div style={{ marginTop: '12px' }}>
                          <div style={{ borderBottom: '1px solid #94A3B8', height: '32px', marginBottom: '8px' }} />
                          <div style={{ fontSize: '10px', color: '#94A3B8' }}>Date</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Version History */}
                <div style={{ marginTop: '32px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '12px' }}>Version History</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden' }}>
                    <thead>
                      <tr style={{ background: '#F1F5F9' }}>
                        {['VERSION', 'DATE', 'AUTHOR', 'CHANGES'].map(h => (
                          <th key={h} style={{ height: '32px', padding: '0 12px', textAlign: 'left', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#64748B' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ height: '36px', padding: '0 12px', fontSize: '13px', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: '#2563EB' }}>1.0</td>
                        <td style={{ height: '36px', padding: '0 12px', fontSize: '13px', color: '#334155' }}>{dateStr}</td>
                        <td style={{ height: '36px', padding: '0 12px', fontSize: '13px', color: '#334155' }}>ReqFlow AI</td>
                        <td style={{ height: '36px', padding: '0 12px', fontSize: '13px', color: '#334155' }}>Initial generation</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Document footer */}
                <div style={{ marginTop: '40px', paddingTop: '16px', borderTop: '1px solid #E2E8F0', textAlign: 'center', fontSize: '11px', color: '#94A3B8' }}>
                  {doc.id} · {tpl.name} · {dateStr} · Generated by ReqFlow AI
                </div>
              </div>
            </div>
          )}

          {/* ──── REQUIREMENTS TAB ──── */}
          {activeTab === 'reqs' && (
            <div style={{ padding: '16px 24px' }}>
              {/* Filter bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ position: 'relative', flex: '0 1 320px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    value={reqSearch}
                    onChange={e => setReqSearch(e.target.value)}
                    placeholder="🔍 Search requirements..."
                    style={{ width: '100%', height: '32px', paddingLeft: '32px', paddingRight: '12px', fontSize: '13px', border: '1px solid #E2E8F0', borderRadius: '6px', outline: 'none', background: 'transparent', color: '#0F172A' }}
                    onFocus={e => (e.target.style.borderColor = '#2563EB')}
                    onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
                  />
                </div>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>Showing {filteredReqs.length} of {doc.requirements.length}</span>
                {reqSearch && (
                  <button onClick={() => setReqSearch('')} style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', background: 'none', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <X size={10} /> Clear
                  </button>
                )}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {([
                      { col: 'code' as const, label: 'ID', w: '100px' },
                      { col: 'type' as const, label: 'TYPE', w: '130px' },
                      { col: 'priority' as const, label: 'PRIORITY', w: '100px' },
                      { col: 'description' as const, label: 'DESCRIPTION', w: undefined },
                    ]).map(h => (
                      <th
                        key={h.label}
                        onClick={() => toggleReqSort(h.col)}
                        style={{ height: '36px', padding: '0 12px', textAlign: 'left', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94A3B8', borderBottom: '2px solid #E2E8F0', width: h.w, cursor: 'pointer', userSelect: 'none' }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {h.label}
                          {reqSortCol === h.col && (reqSortDir === 'asc' ? <SortAsc size={10} /> : <SortDesc size={10} />)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredReqs.map(req => (
                    <tr key={req.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle', fontSize: '11px', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: '#2563EB' }}>{req.code}</td>
                      <td style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', height: '20px', padding: '0 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 500, background: req.type === 'functional' ? '#DBEAFE' : '#F3E8FF', color: req.type === 'functional' ? '#1E40AF' : '#6B21A8' }}>
                          {req.type === 'functional' ? 'FUNC' : 'NFR'}
                        </span>
                      </td>
                      <td style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', height: '20px', padding: '0 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
                          background: req.priority === 'must' ? '#FEE2E2' : req.priority === 'should' ? '#FEF3C7' : req.priority === 'could' ? '#DBEAFE' : '#F1F5F9',
                          color: req.priority === 'must' ? '#991B1B' : req.priority === 'should' ? '#92400E' : req.priority === 'could' ? '#1E40AF' : '#475569',
                        }}>
                          {req.priority}
                        </span>
                      </td>
                      <td style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle', fontSize: '13px', color: '#334155' }}>{req.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ──── EPICS TAB ──── */}
          {activeTab === 'epics' && (
            <div style={{ padding: '16px 24px' }}>
              {doc.epics.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0' }}>
                  <AlertCircle size={28} style={{ color: '#94A3B8', marginBottom: '12px' }} />
                  <p style={{ fontSize: '13px', color: '#64748B' }}>No epics generated for this BRD.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {doc.epics.map((epic, epicIdx) => {
                    const isExpanded = expandedEpics.has(epic.id);
                    const epicColors = ['#2563EB', '#7C3AED', '#D97706', '#059669', '#C2410C', '#B91C1C', '#0D9488', '#6366F1', '#EA580C', '#0891B2', '#4F46E5', '#DC2626'];
                    const leftColor = epicColors[epicIdx % epicColors.length];
                    return (
                      <div key={epic.id} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden', borderLeft: `3px solid ${leftColor}` }}>
                        <button
                          onClick={() => setExpandedEpics(prev => { const n = new Set(prev); n.has(epic.id) ? n.delete(epic.id) : n.add(epic.id); return n; })}
                          style={{ width: '100%', height: '48px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          {isExpanded ? <ChevronDown size={14} style={{ color: '#64748B' }} /> : <ChevronRight size={14} style={{ color: '#64748B' }} />}
                          <span style={{ fontSize: '11px', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: leftColor, minWidth: '60px' }}>{epic.id}</span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', flex: 1 }}>{epic.title}</span>
                          <span style={{ fontSize: '12px', color: '#64748B' }}>{epic.stories.length} stories · {epic.stories.reduce((a, s) => a + s.points, 0)} pts</span>
                        </button>
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid #E2E8F0', padding: '12px 16px' }}>
                            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '12px' }}>{epic.description}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {epic.stories.map(story => (
                                <div key={story.id} style={{ borderLeft: '3px solid #2563EB', background: '#FAFBFE', borderRadius: '6px', padding: '12px 16px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#2563EB' }}>{story.id}</span>
                                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A' }}>{story.title}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: '#0F172A' }}>{story.points} pts</span>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', height: '20px', padding: '0 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 500, textTransform: 'capitalize',
                                        background: story.priority === 'high' ? '#FEF2F2' : story.priority === 'medium' ? '#FEF3C7' : '#ECFDF5',
                                        color: story.priority === 'high' ? '#B91C1C' : story.priority === 'medium' ? '#D97706' : '#059669',
                                      }}>
                                        {story.priority}
                                      </span>
                                      <button
                                        onClick={() => { navigator.clipboard.writeText(`${story.id}: ${story.title}\nPoints: ${story.points}\nPriority: ${story.priority}\n${(story.acceptance || []).join('\n')}`); showToast('success', `${story.id} copied`); }}
                                        style={{ padding: '2px', borderRadius: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                                        onMouseEnter={e => (e.currentTarget.style.color = '#2563EB')}
                                        onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}
                                      >
                                        <Copy size={12} />
                                      </button>
                                    </div>
                                  </div>
                                  {story.acceptance && story.acceptance.length > 0 && (
                                    <div style={{ marginTop: '4px' }}>
                                      {story.acceptance.map((ac, acIdx) => (
                                        <div key={acIdx} style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.6 }}>{ac}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ──── UAT TAB ──── */}
          {activeTab === 'uat' && (
            <div style={{ padding: '16px 24px' }}>
              {/* UAT header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: uatCoverage >= 90 ? '#10B981' : uatCoverage >= 70 ? '#D97706' : '#EF4444' }}>
                      {uatCoverage}%
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94A3B8' }}>Coverage</div>
                  </div>
                  <div style={{ width: '1px', height: '32px', background: '#E2E8F0' }} />
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>{doc.uatCases.length}</div>
                    <div style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94A3B8' }}>Scenarios</div>
                  </div>
                </div>
                <SmallBtn icon={<Download size={13} />} label="Export UAT .csv" onClick={() => handleExportUat(doc)} />
              </div>

              {doc.uatCases.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0' }}>
                  <AlertCircle size={28} style={{ color: '#94A3B8', marginBottom: '12px' }} />
                  <p style={{ fontSize: '13px', color: '#64748B' }}>No UAT cases generated for this BRD.</p>
                </div>
              ) : (
                <>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC' }}>
                        {['ID', 'TYPE', 'SCENARIO', 'GIVEN', 'WHEN', 'THEN', 'PRIORITY'].map(h => (
                          <th key={h} style={{ height: '36px', padding: '0 12px', textAlign: 'left', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94A3B8', borderBottom: '2px solid #E2E8F0' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {doc.uatCases.slice(0, uatDisplayLimit).map(uat => (
                        <tr key={uat.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#2563EB', whiteSpace: 'nowrap' }}>{uat.id}</td>
                          <td style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', height: '20px', padding: '0 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 500,
                              background: uat.type === 'negative' ? '#FEF2F2' : '#ECFDF5',
                              color: uat.type === 'negative' ? '#991B1B' : '#065F46',
                            }}>
                              {uat.type === 'negative' ? 'Negative' : 'Positive'}
                            </span>
                          </td>
                          <td style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle', fontSize: '13px', color: '#334155', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uat.scenario}</td>
                          <td style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle', fontSize: '12px', color: '#64748B', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uat.given}</td>
                          <td style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle', fontSize: '12px', color: '#64748B', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uat.when}</td>
                          <td style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle', fontSize: '12px', color: '#64748B', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uat.then}</td>
                          <td style={{ height: '36px', maxHeight: '36px', padding: '0 12px', verticalAlign: 'middle' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', height: '20px', padding: '0 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 500, textTransform: 'capitalize',
                              background: uat.priority === 'high' ? '#FEF2F2' : uat.priority === 'medium' ? '#FEF3C7' : '#ECFDF5',
                              color: uat.priority === 'high' ? '#B91C1C' : uat.priority === 'medium' ? '#D97706' : '#059669',
                            }}>
                              {uat.priority}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {doc.uatCases.length > uatDisplayLimit && (
                    <div style={{ textAlign: 'center', padding: '12px', fontSize: '13px', color: '#64748B', background: '#F8FAFC', borderRadius: '0 0 8px 8px', borderTop: '1px solid #E2E8F0' }}>
                      ...and {doc.uatCases.length - uatDisplayLimit} more scenarios. <button onClick={() => handleExportUat(doc)} style={{ color: '#2563EB', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Export all as .csv</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ──── STICKY EXPORT BAR ──── */}
        <div style={{ position: 'sticky', bottom: 0, zIndex: 5, flexShrink: 0, padding: '10px 24px', background: '#FFF', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', boxShadow: '0 -2px 8px rgba(0,0,0,0.04)' }}>
          <SmallBtn icon={<Download size={13} />} label="Full BRD HTML" onClick={() => handleExport(doc)} />
          <SmallBtn icon={<Download size={13} />} label="BRD Only" onClick={() => handleExport(doc, true)} />
          <SmallBtn icon={<Download size={13} />} label="UAT .csv" onClick={() => handleExportUat(doc)} />
          <SmallBtn icon={<Clipboard size={13} />} label="Copy All" onClick={() => handleCopyAll(doc)} />
          <button
            onClick={() => { setJiraKey(''); setShowJiraModal(true); }}
            style={{ height: '32px', padding: '0 14px', fontSize: '13px', fontWeight: 600, color: '#FFF', background: '#2563EB', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 3px rgba(37,99,235,0.3)' }}
          >
            <ExternalLink size={13} /> Publish to Jira
          </button>
        </div>

        {/* ──── JIRA MODAL ──── */}
        {showJiraModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.5)' }} onClick={() => !jiraPublishing && setShowJiraModal(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#FFF', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '440px', boxShadow: '0 24px 48px rgba(0,0,0,0.15)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>Publish to Jira</h3>
              <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>Sync {doc.requirements.length} requirements and {doc.epics.length} epics to your Jira project.</p>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#0F172A', marginBottom: '8px' }}>Jira Project Key</label>
              <input
                value={jiraKey}
                onChange={e => setJiraKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="e.g. PROJ"
                maxLength={10}
                style={{ width: '100%', height: '40px', padding: '0 12px', fontSize: '14px', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", border: '1px solid #E2E8F0', borderRadius: '8px', outline: 'none', textTransform: 'uppercase', letterSpacing: '1px', color: '#0F172A' }}
                onFocus={e => (e.target.style.borderColor = '#2563EB')}
                onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
              />
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>2-10 uppercase alphanumeric characters</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowJiraModal(false)} disabled={jiraPublishing} style={{ height: '36px', padding: '0 16px', fontSize: '13px', fontWeight: 500, color: '#64748B', background: 'none', border: '1px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                <button
                  onClick={handleJiraPublish}
                  disabled={jiraKey.length < 2 || jiraPublishing}
                  style={{
                    height: '36px', padding: '0 16px', fontSize: '13px', fontWeight: 600, color: '#FFF',
                    background: jiraKey.length >= 2 && !jiraPublishing ? '#2563EB' : '#94A3B8',
                    borderRadius: '8px', border: 'none', cursor: jiraKey.length >= 2 && !jiraPublishing ? 'pointer' : 'not-allowed',
                    display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: jiraKey.length >= 2 ? 1 : 0.5,
                  }}
                >
                  {jiraPublishing ? 'Publishing...' : 'Publish'}
                  {!jiraPublishing && <ExternalLink size={13} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════════════════════

function ActionBtn({ icon, title, onClick, danger }: { icon: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#94A3B8' }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? '#FEF2F2' : '#F1F5F9'; e.currentTarget.style.color = danger ? '#EF4444' : '#0F172A'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}
    >
      {icon}
    </button>
  );
}

function SmallBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ height: '32px', padding: '0 12px', fontSize: '13px', fontWeight: 500, color: '#334155', background: 'transparent', border: '1px solid #E2E8F0', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {icon} {label}
    </button>
  );
}
