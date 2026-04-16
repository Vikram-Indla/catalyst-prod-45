/**
 * ThemeAlignmentView — CIO-Grade Full-Screen Strategy Alignment Map
 * With Chain Focus Zoom & AI Executive Story Panel
 */
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, X, Minus, Plus, RotateCcw, Unlink, Sparkles, RefreshCw, Copy, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAlignmentMapData, type AlignmentNode, type AlignmentRow } from '@/hooks/useAlignmentMapData';
import { catalystToast } from '@/lib/catalystToast';
import { useChainIntelligence, useEpicStories, useChainDefects, useOwnerRoles } from '@/hooks/useChainIntelligence';
import { computeChainMetrics } from '@/utils/computeChainMetrics';
import { generateIntelligence, type AIResult } from '@/utils/generateIntelligence';
import { AIStrategyIntelligencePanel } from '@/components/strategy/intelligence/AIStrategyIntelligencePanel';

// ── Layer colors (NO purple for KRs) ──
const LAYER = {
  theme:      { color: '#2563EB', badgeBg: '#EFF6FF', badgeText: '#1E40AF', border: '#2563EB' },
  goal:       { color: '#0D9488', badgeBg: '#F0FDFA', badgeText: '#115E59', border: '#0D9488' },
  kr:         { color: '#2563EB', badgeBg: '#DBEAFE', badgeText: '#1E40AF', border: '#2563EB' },
  initiative: { color: '#D97706', badgeBg: '#FFFBEB', badgeText: '#92400E', border: '#D97706' },
  epic:       { color: '#4F46E5', badgeBg: '#EEF2FF', badgeText: '#3730A3', border: '#4F46E5' },
} as const;

const STATUS_CONFIG: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  active:       { dot: '#16A34A', bg: '#F0FDF4', text: '#166534', label: 'Active' },
  on_track:     { dot: '#16A34A', bg: '#F0FDF4', text: '#166534', label: 'On Track' },
  at_risk:      { dot: '#D97706', bg: '#FFFBEB', text: '#92400E', label: 'At Risk' },
  off_track:    { dot: '#EF4444', bg: '#FEF2F2', text: '#991B1B', label: 'Off Track' },
  draft:        { dot: '#94A3B8', bg: 'var(--bg-1, #F8FAFC)', text: '#475569', label: 'Draft' },
  planned:      { dot: '#94A3B8', bg: 'var(--bg-1, #F8FAFC)', text: '#475569', label: 'Planned' },
  completed:    { dot: '#2563EB', bg: '#EFF6FF', text: '#1E40AF', label: 'Done' },
  cancelled:    { dot: '#94A3B8', bg: 'var(--bg-1, #F8FAFC)', text: '#475569', label: 'Cancelled' },
  in_progress:  { dot: '#2563EB', bg: '#EFF6FF', text: '#1E40AF', label: 'In Progress' },
  not_started:  { dot: '#94A3B8', bg: 'var(--bg-1, #F8FAFC)', text: '#475569', label: 'Not Started' },
  approved:     { dot: '#0D9488', bg: '#F0FDFA', text: '#115E59', label: 'Approved' },
  proposed:     { dot: '#94A3B8', bg: 'var(--bg-1, #F8FAFC)', text: '#475569', label: 'Proposed' },
  analyzing:    { dot: '#94A3B8', bg: 'var(--bg-1, #F8FAFC)', text: '#475569', label: 'Analyzing' },
};

function getProgressColor(v: number) {
  if (v >= 60) return '#16A34A';
  if (v >= 40) return '#D97706';
  return '#EF4444';
}

// ── Sub-components ──

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG.draft;
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md shrink-0"
      style={{ background: c.bg, color: c.text, fontSize: 9, fontWeight: 600 }}>
      <div className="rounded-full shrink-0" style={{ width: 5, height: 5, background: c.dot }} />
      {c.label}
    </div>
  );
}

function ChainStat({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const clr = pct >= 70 ? '#16A34A' : pct >= 40 ? '#D97706' : '#EF4444';
  return (
    <div className="text-center" style={{ minWidth: 100 }}>
      <div className="flex items-baseline justify-center gap-1">
        <span className="text-foreground" style={{ fontSize: 15, fontWeight: 700 }}>{value}</span>
        <span className="text-muted-foreground" style={{ fontSize: 12 }}>/{total}</span>
        <span style={{ color: clr, fontSize: 12, fontWeight: 600 }}>({pct}%)</span>
      </div>
      <div className="text-muted-foreground" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );
}

function GhostNode({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5 border border-dashed rounded-lg"
      style={{ width: 180, padding: 12, borderColor: '#CBD5E1', background: 'rgba(248,250,252,0.5)' }}>
      <Unlink size={12} style={{ color: '#94A3B8' }} />
      <span style={{ fontSize: 11, color: '#94A3B8' }}>No linked {label}</span>
    </div>
  );
}

function ChainPill({ color, keyLabel, title }: { color: string; keyLabel: string; title: string }) {
  return (
    <div className="flex items-center gap-1.5 max-w-[180px]">
      <span className="font-mono font-bold px-1.5 py-0.5 rounded shrink-0"
        style={{ fontSize: 9, background: `${color}15`, color }}>
        {keyLabel}
      </span>
      <span className="font-medium truncate" style={{ fontSize: 11, color: '#334155' }}>{title}</span>
    </div>
  );
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-3">
        <p className="uppercase tracking-wider font-semibold text-muted-foreground mb-1" style={{ fontSize: 10 }}>
          {label}
        </p>
        <p className="font-bold leading-none" style={{ fontSize: 20, color }}>
          {value}
        </p>
        {sub && <p className="text-muted-foreground mt-1" style={{ fontSize: 10 }}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

function AILoadingState() {
  return (
    <div className="px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center rounded-xl" style={{ width: 40, height: 40, background: '#F3E8FF' }}>
          <Sparkles size={16} className="animate-pulse" style={{ color: '#2563EB' }} />
        </div>
        <div>
          <div className="h-3 w-48 bg-muted rounded-full animate-pulse" />
          <div className="h-2.5 w-32 bg-muted/50 rounded-full animate-pulse mt-2" />
        </div>
      </div>
      {[1, 2, 3, 4].map(section => (
        <div key={section} className="mb-8">
          <div className="h-3 w-40 bg-muted rounded-full animate-pulse mb-4" />
          <div className="space-y-2.5">
            <div className="h-2.5 w-full bg-muted/50 rounded-full animate-pulse" />
            <div className="h-2.5 bg-muted/50 rounded-full animate-pulse" style={{ width: '90%' }} />
            <div className="h-2.5 bg-muted/50 rounded-full animate-pulse" style={{ width: '75%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Chain health helpers ──
function getChainHealthLabel(chain: LockedChainData | null): string {
  if (!chain) return '—';
  if (!chain.initiative) return 'Broken';
  if (!chain.epic) return 'Partial';
  const goalProgress = chain.goal?.progress || 0;
  const goalStatus = chain.goal?.status || '';
  if (goalStatus === 'off_track' || goalProgress < 30) return 'Critical';
  if (goalStatus === 'at_risk' || goalProgress < 50) return 'At Risk';
  if (goalProgress >= 70) return 'Strong';
  return 'Moderate';
}

function getChainHealthColor(chain: LockedChainData | null): string {
  const label = getChainHealthLabel(chain);
  switch (label) {
    case 'Strong': return '#16A34A';
    case 'Moderate': return '#D97706';
    case 'At Risk': return '#D97706';
    case 'Critical': return '#EF4444';
    case 'Broken': return '#EF4444';
    case 'Partial': return '#D97706';
    default: return '#94A3B8';
  }
}

interface RenderedPath {
  id: string;
  d: string;
  sourceId: string;
  targetId: string;
  layerColor: string;
}

interface LockedChainData {
  theme: { key: string; name: string; status: string; progress: number };
  goal: { key: string; title: string; status: string; progress: number; health?: number };
  krs: { key: string; title: string; status: string; progress: number }[];
  initiative: { key: string; title: string; status: string; progress: number } | null;
  epic: { key: string; title: string; status: string } | null;
}

interface FocusedChain {
  nodes: Set<string>;
  clickedNodeId: string;
  chainData: LockedChainData;
}

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════
export function ThemeAlignmentView({ onBack }: { onBack?: () => void }) {
  const { data, isLoading } = useAlignmentMapData();
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [selectedThemeFilter, setSelectedThemeFilter] = useState<string>('all');
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<RenderedPath[]>([]);

  // ── Focus + AI Panel state ──
  const [focusedChain, setFocusedChain] = useState<FocusedChain | null>(null);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [storyContent, setStoryContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // ── AI Strategy Intelligence panel state ──
  const [intelChain, setIntelChain] = useState<{
    themeId: string;
    goalId: string;
    epicId: string | null;
    themeDisplayKey?: string;
  } | null>(null);
  const [isIntelOpen, setIsIntelOpen] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);

  // Fetch chain intelligence data
  const { data: chainIntelData } = useChainIntelligence(
    intelChain?.themeId || null,
    intelChain?.goalId || null
  );
  const { data: epicStories } = useEpicStories(intelChain?.epicId || null);
  const { data: chainDefects } = useChainDefects(intelChain?.epicId || null);

  // Collect owner IDs from chain data for role resolution
  const ownerIds = useMemo(() => {
    if (!chainIntelData || chainIntelData.length === 0) return [];
    const ids: string[] = [];
    chainIntelData.forEach((r: any) => {
      if (r.theme_owner_id) ids.push(r.theme_owner_id);
      if (r.goal_owner_id) ids.push(r.goal_owner_id);
      if (r.kr_owner_id) ids.push(r.kr_owner_id);
      if (r.initiative_owner_id) ids.push(r.initiative_owner_id);
      if (r.epic_owner_id) ids.push(r.epic_owner_id);
    });
    return ids;
  }, [chainIntelData]);

  const { data: ownerRoleMap } = useOwnerRoles(ownerIds);

  // Compute metrics
  const chainMetrics = useMemo(() => {
    if (!chainIntelData || chainIntelData.length === 0) return null;
    return computeChainMetrics(chainIntelData, epicStories || [], chainDefects || [], ownerRoleMap || undefined, intelChain?.themeDisplayKey);
  }, [chainIntelData, epicStories, chainDefects, ownerRoleMap, intelChain?.themeDisplayKey]);
  const filteredData = useMemo(() => {
    if (!data) return null;
    if (selectedThemeFilter === 'all') return data;

    const goalIds = data.themeToGoals.get(selectedThemeFilter) || new Set();
    const krIds = new Set<string>();
    goalIds.forEach(gid => { const krs = data.goalToKrs.get(gid); if (krs) krs.forEach(k => krIds.add(k)); });
    const iniIds = new Set<string>();
    krIds.forEach(kid => { const inis = data.krToInitiatives.get(kid); if (inis) inis.forEach(i => iniIds.add(i)); });
    const epicIds = new Set<string>();
    iniIds.forEach(iid => { const eps = data.initiativeToEpics.get(iid); if (eps) eps.forEach(e => epicIds.add(e)); });

    return {
      ...data,
      themes: data.themes.filter(t => t.id === selectedThemeFilter),
      goals: data.goals.filter(g => goalIds.has(g.id)),
      krs: data.krs.filter(k => krIds.has(k.id)),
      initiatives: data.initiatives.filter(i => iniIds.has(i.id)),
      epics: data.epics.filter(e => epicIds.has(e.id)),
    };
  }, [data, selectedThemeFilter]);

  // ── Get connected nodes for a given nodeId ──
  const getConnectedNodes = useCallback((nodeId: string): Set<string> => {
    if (!data) return new Set();
    const connected = new Set<string>();
    data.rows.forEach((row: AlignmentRow) => {
      const ids: Record<string, string | null> = {
        [`theme-${row.theme_key}`]: row.theme_id,
        [`goal-${row.goal_key}`]: row.goal_id,
        [`kr-${row.kr_key}`]: row.kr_id,
        [`initiative-${row.initiative_key}`]: row.initiative_id,
        [`epic-${row.epic_key}`]: row.epic_id,
      };
      const nodeIds = Object.keys(ids).filter(k => ids[k] != null);
      if (nodeIds.includes(nodeId)) {
        nodeIds.forEach(n => connected.add(n));
      }
    });
    return connected;
  }, [data]);

  // ── Build chain data for a clicked node ──
  const buildChainData = useCallback((nodeId: string): LockedChainData | null => {
    if (!data) return null;
    const matchingRows = data.rows.filter((row: AlignmentRow) => {
      const ids: Record<string, string | null> = {
        [`theme-${row.theme_key}`]: row.theme_id,
        [`goal-${row.goal_key}`]: row.goal_id,
        [`kr-${row.kr_key}`]: row.kr_id,
        [`initiative-${row.initiative_key}`]: row.initiative_id,
        [`epic-${row.epic_key}`]: row.epic_id,
      };
      return Object.keys(ids).filter(k => ids[k] != null).includes(nodeId);
    });
    if (matchingRows.length === 0) return null;

    const firstRow = matchingRows[0];
    const theme = { key: firstRow.theme_key, name: firstRow.theme_name, status: firstRow.theme_status, progress: Number(firstRow.theme_progress) || 0 };
    const goal = firstRow.goal_id ? {
      key: firstRow.goal_key || '', title: firstRow.goal_title || '', status: firstRow.goal_status || 'draft',
      progress: Number(firstRow.goal_progress) || 0, health: firstRow.goal_health != null ? Number(firstRow.goal_health) : undefined,
    } : { key: '', title: 'No goal linked', status: 'draft', progress: 0 };

    const krsMap = new Map<string, { key: string; title: string; status: string; progress: number }>();
    matchingRows.forEach(r => {
      if (r.kr_id && !krsMap.has(r.kr_id)) {
        krsMap.set(r.kr_id, { key: r.kr_key || '', title: r.kr_title || '', status: r.kr_status || 'not_started', progress: Number(r.kr_progress) || 0 });
      }
    });

    const initiative = firstRow.initiative_id ? {
      key: firstRow.initiative_key || '', title: firstRow.initiative_title || '', status: firstRow.initiative_status || 'draft', progress: Number(firstRow.initiative_progress) || 0,
    } : null;
    const epic = firstRow.epic_id ? {
      key: firstRow.epic_key || '', title: firstRow.epic_title || '', status: firstRow.epic_status || 'proposed',
    } : null;

    return { theme, goal, krs: Array.from(krsMap.values()), initiative, epic };
  }, [data]);

  // ── Generate executive story via edge function (streaming) ──
  const generateExecutiveStory = useCallback(async (chainData: LockedChainData) => {
    setIsGenerating(true);
    setStoryContent('');
    setAiError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated — please sign in');

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alignment-story`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ chainData }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `AI request failed (${resp.status})`);
      }

      if (!resp.body) throw new Error('No response stream');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) { fullText += content; setStoryContent(fullText); }
          } catch { textBuffer = line + '\n' + textBuffer; break; }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) { fullText += content; setStoryContent(fullText); }
          } catch { /* ignore partial */ }
        }
      }
    } catch (err: any) {
      console.error('AI story generation error:', err);
      setAiError(err.message || 'Failed to generate briefing');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // ── Highlight chain on hover (only when no chain is focused) ──
  const highlightChain = useCallback((nodeId: string) => {
    if (focusedChain) return;
    setHighlightedNodes(getConnectedNodes(nodeId));
  }, [getConnectedNodes, focusedChain]);

  const clearHighlight = useCallback(() => {
    if (focusedChain) return;
    setHighlightedNodes(new Set());
  }, [focusedChain]);

  // ── Handle node click → Focus chain + open Intelligence panel with brief ──
  const handleNodeClick = useCallback((nodeId: string) => {
    const chainNodes = getConnectedNodes(nodeId);
    const chainData = buildChainData(nodeId);
    if (!chainData) return;

    setFocusedChain({ nodes: chainNodes, clickedNodeId: nodeId, chainData });
    setHighlightedNodes(chainNodes);
    // Generate executive brief content
    setIsAIPanelOpen(true);
    generateExecutiveStory(chainData);

    // Open Intelligence panel — find theme_id, goal_id, epic_id from rows
    if (data?.rows) {
      const matchingRow = data.rows.find((row: AlignmentRow) => {
        const ids: Record<string, string | null> = {
          [`theme-${row.theme_key}`]: row.theme_id,
          [`goal-${row.goal_key}`]: row.goal_id,
          [`kr-${row.kr_key}`]: row.kr_id,
          [`initiative-${row.initiative_key}`]: row.initiative_id,
          [`epic-${row.epic_key}`]: row.epic_id,
        };
        return Object.keys(ids).filter(k => ids[k] != null).includes(nodeId);
      });
      if (matchingRow && matchingRow.theme_id && matchingRow.goal_id) {
        setIntelChain({
          themeId: matchingRow.theme_id,
          goalId: matchingRow.goal_id,
          epicId: matchingRow.epic_id || null,
          themeDisplayKey: matchingRow.theme_key || undefined,
        });
        setIsIntelOpen(true);
        setIsAILoading(true);
        setAiResult(null);
      }
    }
  }, [getConnectedNodes, buildChainData, generateExecutiveStory, data]);

  // ── Unfocus / close panel ──
  const handleUnfocus = useCallback(() => {
    setFocusedChain(null);
    setIsAIPanelOpen(false);
    setHighlightedNodes(new Set());
    setStoryContent('');
    setAiError(null);
    // Also close intelligence panel
    setIntelChain(null);
    setIsIntelOpen(false);
    setAiResult(null);
    setIsAILoading(false);
  }, []);

  // ── Build connections list ──
  const connections = useMemo(() => {
    if (!filteredData) return [];
    const conns: { id: string; sourceId: string; targetId: string; layerColor: string }[] = [];
    const addConns = (map: Map<string, Set<string>>, srcPrefix: string, tgtPrefix: string, color: string,
      srcNodes: AlignmentNode[], tgtNodes: AlignmentNode[]) => {
      const srcKeyMap = new Map(srcNodes.map(n => [n.id, n.key]));
      const tgtKeyMap = new Map(tgtNodes.map(n => [n.id, n.key]));
      for (const [parentId, childIds] of map.entries()) {
        const srcKey = srcKeyMap.get(parentId);
        if (!srcKey) continue;
        childIds.forEach(childId => {
          const tgtKey = tgtKeyMap.get(childId);
          if (!tgtKey) return;
          conns.push({ id: `${srcPrefix}-${srcKey}-${tgtPrefix}-${tgtKey}`, sourceId: `${srcPrefix}-${srcKey}`, targetId: `${tgtPrefix}-${tgtKey}`, layerColor: color });
        });
      }
    };
    addConns(filteredData.themeToGoals, 'theme', 'goal', LAYER.theme.color, filteredData.themes, filteredData.goals);
    addConns(filteredData.goalToKrs, 'goal', 'kr', LAYER.goal.color, filteredData.goals, filteredData.krs);
    addConns(filteredData.krToInitiatives, 'kr', 'initiative', LAYER.kr.color, filteredData.krs, filteredData.initiatives);
    addConns(filteredData.initiativeToEpics, 'initiative', 'epic', LAYER.initiative.color, filteredData.initiatives, filteredData.epics);
    return conns;
  }, [filteredData]);

  // ── Connector recalculation ──
  const recalculateConnections = useCallback(() => {
    if (!innerRef.current || connections.length === 0) { setPaths([]); return; }
    const container = innerRef.current;
    const containerRect = container.getBoundingClientRect();
    const positions = new Map<string, { right: number; left: number; centerY: number }>();
    container.querySelectorAll('[data-node-id]').forEach(el => {
      const id = el.getAttribute('data-node-id')!;
      const r = el.getBoundingClientRect();
      positions.set(id, {
        right: (r.right - containerRect.left) / zoom,
        left: (r.left - containerRect.left) / zoom,
        centerY: (r.top + r.height / 2 - containerRect.top) / zoom,
      });
    });
    const newPaths = connections.map(conn => {
      const src = positions.get(conn.sourceId);
      const tgt = positions.get(conn.targetId);
      if (!src || !tgt) return null;
      const x1 = src.right + 6; const y1 = src.centerY;
      const x2 = tgt.left - 6; const y2 = tgt.centerY;
      const cp = Math.min(Math.abs(x2 - x1) * 0.4, 50);
      return { id: conn.id, d: `M ${x1} ${y1} C ${x1 + cp} ${y1}, ${x2 - cp} ${y2}, ${x2} ${y2}`, sourceId: conn.sourceId, targetId: conn.targetId, layerColor: conn.layerColor };
    }).filter(Boolean) as RenderedPath[];
    setPaths(newPaths);
  }, [connections, zoom]);

  // ResizeObserver + window resize
  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const raf = () => requestAnimationFrame(recalculateConnections);
    requestAnimationFrame(() => requestAnimationFrame(recalculateConnections));
    const ro = new ResizeObserver(raf);
    ro.observe(inner);
    window.addEventListener('resize', raf);
    return () => { ro.disconnect(); window.removeEventListener('resize', raf); };
  }, [recalculateConnections]);

  // Recalc on zoom/pan/filter
  useEffect(() => {
    requestAnimationFrame(recalculateConnections);
  }, [zoom, pan, selectedThemeFilter, recalculateConnections]);

  // Recalc after panel animation completes
  useEffect(() => {
    const timer = setTimeout(recalculateConnections, 450);
    return () => clearTimeout(timer);
  }, [isAIPanelOpen, isIntelOpen, recalculateConnections]);

  // ── Trigger AI when intelligence metrics are ready ──
  useEffect(() => {
    if (chainMetrics && isIntelOpen && !aiResult) {
      const firstRow = chainIntelData?.[0];
      if (firstRow) {
        generateIntelligence(firstRow, chainMetrics).then(result => {
          setAiResult(result);
          setIsAILoading(false);
        });
      }
    }
  }, [chainMetrics, isIntelOpen]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isIntelOpen) {
          handleUnfocus();
        } else {
          handleExit();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isIntelOpen]);

  // ── Pan handlers ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-node-id]')) return;
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: panStart.current.px + (e.clientX - panStart.current.x), y: panStart.current.py + (e.clientY - panStart.current.y) });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.3, Math.min(2, z - e.deltaY * 0.001)));
  }, []);

  const resetView = useCallback(() => { setZoom(0.85); setPan({ x: 0, y: 0 }); }, []);
  const handleExit = useCallback(() => onBack?.(), [onBack]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      catalystToast.success('Copied', 'Executive brief copied to clipboard.');
    });
  }, []);

  const handleRegenerateAI = useCallback(() => {
    if (!chainMetrics || !chainIntelData?.[0]) return;
    setIsAILoading(true);
    setAiResult(null);
    generateIntelligence(chainIntelData[0], chainMetrics).then(result => {
      setAiResult(result);
      setIsAILoading(false);
    });
  }, [chainMetrics, chainIntelData]);

  const handleCloseIntelligence = useCallback(() => {
    setFocusedChain(null);
    setHighlightedNodes(new Set());
    setIntelChain(null);
    setIsIntelOpen(false);
    setIsAIPanelOpen(false);
    setAiResult(null);
    setIsAILoading(false);
    setStoryContent('');
    setAiError(null);
  }, []);

  // ── Focus-aware style helpers ──
  const isFocused = focusedChain !== null;
  const anyHover = highlightedNodes.size > 0;

  function getCardClasses(nodeId: string): string {
    if (!isFocused && !anyHover) return 'shadow-sm hover:shadow-lg hover:scale-[1.02]';
    if (isFocused) {
      if (focusedChain!.nodes.has(nodeId)) return 'shadow-elevated';
      return 'shadow-none pointer-events-none';
    }
    // Hover-only (no focus)
    return highlightedNodes.has(nodeId) ? 'shadow-md scale-[1.02]' : '';
  }

  function getCardStyle(nodeId: string): React.CSSProperties {
    if (!isFocused && !anyHover) return {};
    if (isFocused) {
      if (focusedChain!.nodes.has(nodeId)) {
        return {
          transform: 'scale(1.12)', opacity: 1, zIndex: 20,
          boxShadow: '0 4px 24px -4px rgba(37,99,235,0.18), 0 0 0 1.5px rgba(37,99,235,0.15)',
          transition: 'all 500ms ease-out',
        };
      }
      return { transform: 'scale(0.92)', opacity: 0.08, zIndex: 1, transition: 'all 500ms ease-out' };
    }
    // Hover-only
    if (highlightedNodes.has(nodeId)) {
      return { opacity: 1, boxShadow: '0 2px 16px -2px rgba(37,99,235,0.14), 0 0 0 1px rgba(37,99,235,0.1)' };
    }
    return { opacity: 0.2 };
  }

  function getPathStyle(p: RenderedPath) {
    if (!isFocused && !anyHover) {
      return { stroke: '#D1D5DB', strokeWidth: 1, opacity: 0.35, filter: 'none' };
    }
    if (isFocused) {
      const srcIn = focusedChain!.nodes.has(p.sourceId);
      const tgtIn = focusedChain!.nodes.has(p.targetId);
      if (srcIn && tgtIn) {
        return { stroke: p.layerColor, strokeWidth: 3, opacity: 1, filter: 'drop-shadow(0 0 4px rgba(37, 99, 235, 0.3))' };
      }
      return { stroke: 'var(--bd-default, #E2E8F0)', strokeWidth: 0.5, opacity: 0.05, filter: 'none' };
    }
    // Hover-only
    const isLit = highlightedNodes.has(p.sourceId) && highlightedNodes.has(p.targetId);
    if (isLit) return { stroke: p.layerColor, strokeWidth: 2.5, opacity: 1, filter: 'none' };
    return { stroke: '#D1D5DB', strokeWidth: 1, opacity: 0.08, filter: 'none' };
  }

  // ── Loading / empty states ──
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <div className="animate-pulse text-sm text-muted-foreground">Loading alignment data…</div>
      </div>
    );
  }

  if (!filteredData || filteredData.themes.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-background">
        <p className="text-sm text-muted-foreground">No alignment data available.</p>
        <Button variant="link" onClick={handleExit}>← Back to Strategic Themes</Button>
      </div>
    );
  }

  const stats = data?.stats;
  const krsWithoutInitiative = filteredData.krs.filter(kr => !filteredData.krToInitiatives.has(kr.id));
  const initsWithoutEpic = filteredData.initiatives.filter(ini => !filteredData.initiativeToEpics.has(ini.id));

  const columns = [
    { key: 'themes', label: 'Strategic Themes', color: LAYER.theme.color, count: filteredData.themes.length },
    { key: 'goals', label: 'Goals', color: LAYER.goal.color, count: filteredData.goals.length },
    { key: 'keyResults', label: 'Key Results', color: LAYER.kr.color, count: filteredData.krs.length },
    { key: 'initiatives', label: 'Initiatives', color: LAYER.initiative.color, count: filteredData.initiatives.length },
    { key: 'epics', label: 'Epics', color: LAYER.epic.color, count: filteredData.epics.length },
  ];

  const lockedChain = focusedChain?.chainData || null;

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-background">
      {/* ═══ TOOLBAR (Light) ═══ */}
      <div className="flex items-center justify-between shrink-0 px-5 border-b border-border bg-card" style={{ height: 52 }}>
        {/* Left: Title + Stats */}
        <div className="flex items-center gap-5">
           <div>
            <CatalystPageHeader title="Strategy Alignment Map" />
          </div>
          {stats && (
            <>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-5">
                <ChainStat label="Linked KRs" value={stats.linkedKrs} total={stats.totalKrs} />
                <Separator orientation="vertical" className="h-5" />
                <ChainStat label="Linked Initiatives" value={stats.linkedInitiatives} total={stats.totalInitiatives} />
                <Separator orientation="vertical" className="h-5" />
                <ChainStat label="Linked Epics" value={stats.linkedEpics} total={stats.totalEpics} />
                <Separator orientation="vertical" className="h-5" />
                <div className="text-center">
                  <div className="text-foreground font-bold" style={{ fontSize: 15 }}>{stats.fullChains}</div>
                  <div className="text-muted-foreground uppercase" style={{ fontSize: 10, letterSpacing: '0.05em' }}>Full Chains</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: Controls + Exit */}
        <div className="flex items-center gap-3">
          <Select value={selectedThemeFilter} onValueChange={setSelectedThemeFilter}>
            <SelectTrigger className="h-8 w-[200px] text-xs border-border bg-muted text-foreground focus:ring-1 focus:ring-brand-primary focus:border-brand-primary">
              <SelectValue placeholder="All Themes" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border shadow-lg rounded-lg">
              <SelectItem value="all">All Themes</SelectItem>
              {data?.themes.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 rounded-md px-1.5 py-1 border border-border bg-muted">
            <TooltipProvider>
              <Tooltip><TooltipTrigger asChild>
                <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}
                  className="flex items-center justify-center rounded w-6 h-6 text-muted-foreground hover:text-foreground">
                  <Minus size={12} />
                </button>
              </TooltipTrigger><TooltipContent>Zoom out</TooltipContent></Tooltip>
            </TooltipProvider>
            <span className="font-mono text-center text-muted-foreground" style={{ fontSize: 10, width: 28 }}>
              {Math.round(zoom * 100)}%
            </span>
            <TooltipProvider>
              <Tooltip><TooltipTrigger asChild>
                <button onClick={() => setZoom(z => Math.min(2, z + 0.1))}
                  className="flex items-center justify-center rounded w-6 h-6 text-muted-foreground hover:text-foreground">
                  <Plus size={12} />
                </button>
              </TooltipTrigger><TooltipContent>Zoom in</TooltipContent></Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip><TooltipTrigger asChild>
                <button onClick={resetView}
                  className="flex items-center justify-center rounded w-6 h-6 text-muted-foreground hover:text-foreground ml-0.5">
                  <RotateCcw size={12} />
                </button>
              </TooltipTrigger><TooltipContent>Reset view</TooltipContent></Tooltip>
            </TooltipProvider>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <Button variant="outline" size="sm" onClick={handleExit}
            className="gap-1.5 border-brand-primary text-brand-primary hover:bg-brand-primary/5 transition-colors shadow-sm font-medium px-4">
            Exit Map
            <X size={14} />
          </Button>
        </div>
      </div>

      {/* ═══ CHAIN EXPLANATION BANNER ═══ */}
      <div className="flex items-center justify-center shrink-0 px-6 border-b border-border bg-muted/50 dark:bg-transparent" style={{ height: 40 }}>
        <div className="flex items-center gap-2 text-muted-foreground dark:text-gray-300" style={{ fontSize: 12 }}>
          <span className="font-semibold text-foreground">Reading this map:</span>
          <span>Each</span>
          <Badge variant="outline" className="font-semibold text-[11px] py-0 px-1.5 dark:bg-gray-800 dark:border-gray-700" style={{ color: '#1E40AF', background: '#EFF6FF', borderColor: '#BFDBFE' }}>● Theme</Badge>
          <span>breaks down into</span>
          <Badge variant="outline" className="font-semibold text-[11px] py-0 px-1.5 dark:bg-gray-800 dark:border-gray-700" style={{ color: '#115E59', background: '#F0FDFA', borderColor: '#99F6E4' }}>● Goals</Badge>
          <span>measured by</span>
          <Badge variant="outline" className="font-semibold text-[11px] py-0 px-1.5 dark:bg-gray-800 dark:border-gray-700" style={{ color: '#1E40AF', background: '#DBEAFE', borderColor: '#93C5FD' }}>● Key Results</Badge>
          <span>delivered through</span>
          <Badge variant="outline" className="font-semibold text-[11px] py-0 px-1.5 dark:bg-gray-800 dark:border-gray-700" style={{ color: '#92400E', background: '#FFFBEB', borderColor: '#FDE68A' }}>● Initiatives</Badge>
          <span>executed as</span>
          <Badge variant="outline" className="font-semibold text-[11px] py-0 px-1.5 dark:bg-gray-800 dark:border-gray-700" style={{ color: '#3730A3', background: '#EEF2FF', borderColor: '#C7D2FE' }}>● Epics</Badge>
        </div>
      </div>

      {/* ═══ MAIN CONTENT AREA (Map + AI Panel) ═══ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ═══ CANVAS ═══ */}
        <div
          ref={canvasRef}
          className="overflow-auto select-none transition-all duration-[400ms] ease-out"
          style={{
            background: 'var(--bg-1, #F8FAFC)',
            cursor: isPanning ? 'grabbing' : 'grab',
            width: isIntelOpen ? '50vw' : '100%',
            flexShrink: 0,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* ═══ COLUMN HEADERS (outside transform so sticky works at all zoom levels) ═══ */}
          <div className="flex border-b-2 border-border bg-card sticky top-0" style={{ zIndex: 10 }}>
            {columns.map(col => (
              <div key={col.key} className="flex items-center gap-2 px-4"
                style={{
                  height: 44,
                  minWidth: col.key === 'themes' ? 224 : col.key === 'goals' || col.key === 'initiatives' ? 214 : 204,
                  borderLeft: `3px solid ${col.color}`,
                }}>
                <div className="rounded-full" style={{ width: 8, height: 8, background: col.color }} />
                <span className="font-bold uppercase text-foreground" style={{ fontSize: 13, letterSpacing: '0.03em' }}>
                  {col.label}
                </span>
                <span className="font-semibold text-muted-foreground" style={{ fontSize: 12 }}>
                  ({col.count})
                </span>
              </div>
            ))}
          </div>

          <div
            ref={innerRef}
            className="relative"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'top left',
              minWidth: 'fit-content',
              minHeight: 'fit-content',
            }}
          >

            {/* SVG connectors */}
            <svg className="absolute inset-0 pointer-events-none"
              style={{ width: '100%', height: '100%', overflow: 'visible', zIndex: 1 }}>
              {paths.map(p => {
                const s = getPathStyle(p);
                return (
                  <path key={p.id} d={p.d}
                    stroke={s.stroke}
                    strokeWidth={s.strokeWidth}
                    fill="none"
                    opacity={s.opacity}
                    style={{ filter: s.filter, transition: 'all 500ms ease-out' }}
                  />
                );
              })}
            </svg>

            {/* Node columns */}
            <div className="relative flex gap-6 p-6" style={{ zIndex: 2 }}>
              {/* THEMES */}
              <div data-column="themes" className="flex flex-col gap-2" style={{ minWidth: 200 }}>
                {filteredData.themes.map(t => {
                  const nid = `theme-${t.key}`;
                  return (
                    <div key={t.id} data-node-id={nid}
                      className={`group cursor-pointer transition-all duration-500 ease-out ${getCardClasses(nid)}`}
                      style={{ width: 200, ...getCardStyle(nid) }}
                      onClick={() => handleNodeClick(nid)}
                      onMouseEnter={() => highlightChain(nid)} onMouseLeave={clearHighlight}>
                      <div style={{ borderLeft: `4px solid ${t.color || LAYER.theme.border}` }}
                        className="bg-card border border-border rounded-lg">
                        <div className="p-3.5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono font-bold rounded-md px-2 py-0.5"
                              style={{ fontSize: 10, background: LAYER.theme.badgeBg, color: LAYER.theme.badgeText, letterSpacing: '0.02em' }}>
                              {t.key}
                            </span>
                            <StatusBadge status={t.status} />
                          </div>
                          <p className="font-semibold leading-snug line-clamp-2 text-foreground" style={{ fontSize: 13 }}>
                            {t.title}
                          </p>
                          <div className="flex items-center gap-2 mt-2.5">
                            <div className="flex-1 rounded-full overflow-hidden bg-muted" style={{ height: 5 }}>
                              <div className="rounded-full transition-all" style={{ width: `${t.progress || 0}%`, height: 5, background: getProgressColor(t.progress || 0) }} />
                            </div>
                            <span className="font-bold text-foreground" style={{ fontSize: 11 }}>{Math.round(t.progress || 0)}%</span>
                          </div>
                          <div className="text-muted-foreground" style={{ fontSize: 10, marginTop: 8 }}>
                            {t.goalCount || 0} goals · {t.krCount || 0} KRs
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* GOALS */}
              <div data-column="goals" className="flex flex-col gap-2" style={{ minWidth: 190 }}>
                {filteredData.goals.map(g => {
                  const nid = `goal-${g.key}`;
                  return (
                    <div key={g.id} data-node-id={nid}
                      className={`group cursor-pointer transition-all duration-500 ease-out ${getCardClasses(nid)}`}
                      style={{ width: 190, ...getCardStyle(nid) }}
                      onClick={() => handleNodeClick(nid)}
                      onMouseEnter={() => highlightChain(nid)} onMouseLeave={clearHighlight}>
                      <div style={{ borderLeft: `4px solid ${LAYER.goal.border}` }}
                        className="bg-card border border-border rounded-lg">
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono font-bold rounded-md px-2 py-0.5"
                              style={{ fontSize: 10, background: LAYER.goal.badgeBg, color: LAYER.goal.badgeText }}>{g.key}</span>
                            <StatusBadge status={g.status} />
                          </div>
                          <p className="font-semibold leading-snug line-clamp-2 text-foreground" style={{ fontSize: 12 }}>{g.title}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 rounded-full overflow-hidden bg-muted" style={{ height: 4 }}>
                              <div className="rounded-full" style={{ width: `${g.progress || 0}%`, height: 4, background: getProgressColor(g.progress || 0) }} />
                            </div>
                            <span className="font-bold text-muted-foreground" style={{ fontSize: 10 }}>{Math.round(g.progress || 0)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* KEY RESULTS — Blue, NOT purple */}
              <div data-column="krs" className="flex flex-col gap-2" style={{ minWidth: 180 }}>
                {filteredData.krs.map(kr => {
                  const nid = `kr-${kr.key}`;
                  return (
                    <div key={kr.id} data-node-id={nid}
                      className={`group cursor-pointer transition-all duration-500 ease-out ${getCardClasses(nid)}`}
                      style={{ width: 180, ...getCardStyle(nid) }}
                      onClick={() => handleNodeClick(nid)}
                      onMouseEnter={() => highlightChain(nid)} onMouseLeave={clearHighlight}>
                      <div style={{ borderLeft: `4px solid ${LAYER.kr.border}` }}
                        className="bg-card border border-border rounded-lg">
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono font-bold rounded-md px-2 py-0.5"
                              style={{ fontSize: 10, background: LAYER.kr.badgeBg, color: LAYER.kr.badgeText }}>{kr.key}</span>
                            <StatusBadge status={kr.status} />
                          </div>
                          <p className="font-medium leading-snug line-clamp-2 text-muted-foreground" style={{ fontSize: 11 }}>{kr.title}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 rounded-full overflow-hidden bg-muted" style={{ height: 3 }}>
                              <div className="rounded-full" style={{ width: `${kr.progress || 0}%`, height: 3, background: getProgressColor(kr.progress || 0) }} />
                            </div>
                            <span className="font-bold text-muted-foreground" style={{ fontSize: 10 }}>{Math.round(kr.progress || 0)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {krsWithoutInitiative.length > 0 && filteredData.initiatives.length === 0 && (
                  <GhostNode label="initiative" />
                )}
              </div>

              {/* INITIATIVES */}
              <div data-column="initiatives" className="flex flex-col gap-2" style={{ minWidth: 190 }}>
                {filteredData.initiatives.length > 0 ? filteredData.initiatives.map(ini => {
                  const nid = `initiative-${ini.key}`;
                  return (
                    <div key={ini.id} data-node-id={nid}
                      className={`group cursor-pointer transition-all duration-500 ease-out ${getCardClasses(nid)}`}
                      style={{ width: 190, ...getCardStyle(nid) }}
                      onClick={() => handleNodeClick(nid)}
                      onMouseEnter={() => highlightChain(nid)} onMouseLeave={clearHighlight}>
                      <div style={{ borderLeft: `4px solid ${LAYER.initiative.border}` }}
                        className="bg-card border border-border rounded-lg">
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono font-bold rounded-md px-2 py-0.5"
                              style={{ fontSize: 10, background: LAYER.initiative.badgeBg, color: LAYER.initiative.badgeText }}>{ini.key}</span>
                            <StatusBadge status={ini.status} />
                          </div>
                          <p className="font-semibold leading-snug line-clamp-2 text-foreground" style={{ fontSize: 12 }}>{ini.title}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 rounded-full overflow-hidden bg-muted" style={{ height: 4 }}>
                              <div className="rounded-full" style={{ width: `${ini.progress || 0}%`, height: 4, background: getProgressColor(ini.progress || 0) }} />
                            </div>
                            <span className="font-bold text-muted-foreground" style={{ fontSize: 10 }}>{Math.round(ini.progress || 0)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <GhostNode label="initiative" />
                )}
                {initsWithoutEpic.length > 0 && filteredData.epics.length === 0 && (
                  <GhostNode label="epic" />
                )}
              </div>

              {/* EPICS */}
              <div data-column="epics" className="flex flex-col gap-2" style={{ minWidth: 180 }}>
                {filteredData.epics.length > 0 ? filteredData.epics.map(epic => {
                  const nid = `epic-${epic.key}`;
                  return (
                    <div key={epic.id} data-node-id={nid}
                      className={`group cursor-pointer transition-all duration-500 ease-out ${getCardClasses(nid)}`}
                      style={{ width: 180, ...getCardStyle(nid) }}
                      onClick={() => handleNodeClick(nid)}
                      onMouseEnter={() => highlightChain(nid)} onMouseLeave={clearHighlight}>
                      <div style={{ borderLeft: `4px solid ${LAYER.epic.border}` }}
                        className="bg-card border border-border rounded-lg">
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono font-bold rounded-md px-2 py-0.5"
                              style={{ fontSize: 10, background: LAYER.epic.badgeBg, color: LAYER.epic.badgeText }}>{epic.key}</span>
                            <StatusBadge status={epic.status} />
                          </div>
                          <p className="font-medium leading-snug line-clamp-2 text-muted-foreground" style={{ fontSize: 11 }}>{epic.title}</p>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <GhostNode label="epic" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ AI Strategy Intelligence Panel (with Executive Brief tab) ═══ */}
      <AIStrategyIntelligencePanel
        isOpen={isIntelOpen}
        metrics={chainMetrics}
        defects={chainDefects || []}
        stories={epicStories || []}
        aiResult={aiResult}
        isAILoading={isAILoading}
        onClose={handleCloseIntelligence}
        onRegenerate={handleRegenerateAI}
        briefContent={storyContent}
        isBriefGenerating={isGenerating}
        briefError={aiError}
        lockedChain={lockedChain}
        onRegenerateBrief={() => lockedChain && generateExecutiveStory(lockedChain)}
      />

      {/* ═══ LEGEND BAR ═══ */}
      <div className="flex items-center justify-center gap-6 shrink-0 border-t border-border bg-card dark:bg-transparent" style={{ height: 50 }}>
        {[
          { label: 'Strategic Theme', color: LAYER.theme.color },
          { label: 'Goal', color: LAYER.goal.color },
          { label: 'Key Result', color: LAYER.kr.color },
          { label: 'Initiative', color: LAYER.initiative.color },
          { label: 'Epic', color: LAYER.epic.color },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5 font-medium text-muted-foreground" style={{ fontSize: 11 }}>
            <div className="rounded-full" style={{ width: 10, height: 3, background: item.color }} />
            {item.label}
          </div>
        ))}
        <Separator orientation="vertical" className="h-3 mx-1" />
        <div className="flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: 11 }}>
          <div style={{ width: 10, height: 0, borderTop: '1px dashed currentColor' }} />
          Unlinked
        </div>
      </div>
    </div>
  );
}
