import React, { useMemo, useState, useCallback } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, XCircle, Zap, HardDrive,
  TrendingDown, TrendingUp, ArrowRight, Shield, Package, Gauge,
  Server, Clock, BarChart3, Lightbulb, RefreshCw, Skull, Flame,
  FileCode, Layers, ChevronRight, ExternalLink, Bug, Cpu, MemoryStick
} from 'lucide-react';
import { ENABLE_FULL_APP, ENABLE_AI, ENABLE_WIKI, ENABLE_KNOWLEDGE_HUB, ENABLE_HEAVY_EXPORTS } from '@/lib/featureFlags';

// ─── STUBBED MODULE REGISTRY ─────────────────────────────────────
// These are the modules the vite plugin stubs out during publish
const STUBBED_MODULES = [
  { name: 'FullAppRoutes', type: 'routes', estimatedKB: 2800, desc: '700+ route manifest with 200+ lazy page imports' },
  { name: 'UnifiedSidebar', type: 'sidebar', estimatedKB: 120, desc: 'Program workspace sidebar' },
  { name: 'EnterpriseSidebar', type: 'sidebar', estimatedKB: 95, desc: 'Enterprise navigation' },
  { name: 'ProductRoomSidebar', type: 'sidebar', estimatedKB: 85, desc: 'Product room navigation' },
  { name: 'ProjectSidebar', type: 'sidebar', estimatedKB: 110, desc: 'Project workspace sidebar' },
  { name: 'OperationsSidebar', type: 'sidebar', estimatedKB: 80, desc: 'Release/Operations sidebar' },
  { name: 'TestManagementSidebar', type: 'sidebar', estimatedKB: 75, desc: 'Legacy test management nav' },
  { name: 'ReleasesManagementSidebar', type: 'sidebar', estimatedKB: 70, desc: 'Legacy releases nav' },
  { name: 'ReleaseHubSidebar', type: 'sidebar', estimatedKB: 80, desc: 'Release hub navigation' },
  { name: 'IncidentHubSidebar', type: 'sidebar', estimatedKB: 75, desc: 'Incident hub navigation' },
  { name: 'PlanHubSidebar', type: 'sidebar', estimatedKB: 85, desc: 'Planning hub navigation' },
  { name: 'TaskHubSidebar', type: 'sidebar', estimatedKB: 70, desc: 'Task hub navigation' },
  { name: 'TestHubSidebar', type: 'sidebar', estimatedKB: 75, desc: 'Test hub navigation' },
  { name: 'WorkHubSidebar', type: 'sidebar', estimatedKB: 90, desc: 'Work hub navigation' },
  { name: 'ProjectHubSidebar', type: 'sidebar', estimatedKB: 85, desc: 'Project hub V5 navigation' },
  { name: 'WikiSidebar', type: 'sidebar', estimatedKB: 80, desc: 'Wiki navigation' },
  { name: 'CreateDropdown', type: 'header', estimatedKB: 65, desc: 'Global create menu' },
  { name: 'GlobalSearchPalette', type: 'header', estimatedKB: 120, desc: 'Cmd+K search palette' },
  { name: 'NotificationsPanel', type: 'header', estimatedKB: 95, desc: 'Notifications dropdown' },
  { name: 'ProgramSelectorDropdown', type: 'header', estimatedKB: 55, desc: 'Program picker' },
  { name: 'ProjectSelectorDropdown', type: 'header', estimatedKB: 55, desc: 'Project picker' },
  { name: 'ProductSelectorDropdown', type: 'header', estimatedKB: 50, desc: 'Product picker' },
  { name: 'MobileNavigationMenu', type: 'header', estimatedKB: 60, desc: 'Mobile nav menu' },
  { name: 'ReleaseDropdown', type: 'header', estimatedKB: 45, desc: 'Release picker' },
  { name: 'CreateEntityDialog', type: 'header', estimatedKB: 80, desc: 'Entity creation dialog' },
  { name: 'CatalystAIPanel', type: 'panel', estimatedKB: 150, desc: 'AI assistant panel' },
  { name: 'AnnouncementBanner', type: 'panel', estimatedKB: 30, desc: 'Announcement banner' },
  { name: 'ForYouDetailPanel', type: 'panel', estimatedKB: 180, desc: 'For-you detail view' },
];

// Heavy node_modules that add significant bundle weight
const HEAVY_DEPS = [
  { name: '@tiptap/*', sizeKB: 450, used: true, dynamic: false },
  { name: 'recharts', sizeKB: 380, used: true, dynamic: false },
  { name: 'd3', sizeKB: 320, used: true, dynamic: false },
  { name: 'jspdf + autotable', sizeKB: 280, used: true, dynamic: true },
  { name: 'xlsx', sizeKB: 250, used: true, dynamic: true },
  { name: 'pptxgenjs', sizeKB: 200, used: true, dynamic: true },
  { name: 'html2canvas', sizeKB: 180, used: true, dynamic: true },
  { name: 'framer-motion', sizeKB: 160, used: true, dynamic: false },
  { name: '@tanstack/react-table', sizeKB: 140, used: true, dynamic: false },
  { name: '@hello-pangea/dnd', sizeKB: 120, used: true, dynamic: false },
  { name: '@radix-ui/*', sizeKB: 350, used: true, dynamic: false },
  { name: 'lucide-react', sizeKB: 180, used: true, dynamic: false },
  { name: 'react-markdown', sizeKB: 90, used: true, dynamic: false },
  { name: '@dnd-kit/*', sizeKB: 100, used: true, dynamic: false },
];

const CORE_BUNDLE_KB = 650;
const PUBLISH_LIMIT_KB = 3500;
const TOTAL_STUBBED_KB = TOTAL_STUBBED_KB;

type DiagnosticStatus = 'pass' | 'warn' | 'fail' | 'info';

interface DiagnosticCheck {
  id: string;
  label: string;
  status: DiagnosticStatus;
  detail: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  fix?: string;
}

export default function PublishDiagnosticsPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>('blockers');

  const checks = useMemo<DiagnosticCheck[]>(() => {
    const results: DiagnosticCheck[] = [];

    // 1. ENABLE_FULL_APP gate
    results.push({
      id: 'full-app-gate',
      label: 'VITE_ENABLE_FULL_APP gate',
      status: ENABLE_FULL_APP ? 'fail' : 'pass',
      detail: ENABLE_FULL_APP
        ? 'ENABLED — all 700+ routes will be bundled. Build WILL OOM.'
        : 'DISABLED — Vite plugin stubs out FullAppRoutes + 27 heavy modules.',
      impact: 'critical',
      fix: ENABLE_FULL_APP ? 'Remove VITE_ENABLE_FULL_APP=true from environment' : undefined,
    });

    // 2. Feature flags
    const flags = [
      { name: 'VITE_ENABLE_AI', value: ENABLE_AI, kb: 450 },
      { name: 'VITE_ENABLE_WIKI', value: ENABLE_WIKI, kb: 280 },
      { name: 'VITE_ENABLE_KNOWLEDGE_HUB', value: ENABLE_KNOWLEDGE_HUB, kb: 200 },
      { name: 'VITE_ENABLE_HEAVY_EXPORTS', value: ENABLE_HEAVY_EXPORTS, kb: 710 },
    ];
    flags.forEach(f => {
      results.push({
        id: `flag-${f.name}`,
        label: `${f.name}`,
        status: f.value ? 'warn' : 'pass',
        detail: f.value
          ? `ENABLED — adds ~${f.kb}KB to build. Disable unless needed.`
          : 'Disabled ✓ — excluded from build.',
        impact: f.value ? 'high' : 'low',
        fix: f.value ? `Remove ${f.name}=true from environment` : undefined,
      });
    });

    // 3. Stubbed module count
    const totalStubbedKB = TOTAL_STUBBED_KB;
    results.push({
      id: 'stub-count',
      label: `Vite plugin stubs (${STUBBED_MODULES.length} modules)`,
      status: 'pass',
      detail: `${STUBBED_MODULES.length} modules stubbed = ~${(totalStubbedKB / 1024).toFixed(1)}MB eliminated from build.`,
      impact: 'critical',
    });

    // 4. Estimated lean bundle
    const leanBundleKB = CORE_BUNDLE_KB + (ENABLE_AI ? 450 : 0) + (ENABLE_WIKI ? 280 : 0) + (ENABLE_HEAVY_EXPORTS ? 710 : 0);
    const withinLimit = leanBundleKB < PUBLISH_LIMIT_KB;
    results.push({
      id: 'bundle-estimate',
      label: `Estimated build size: ~${(leanBundleKB / 1024).toFixed(1)}MB`,
      status: withinLimit ? 'pass' : 'fail',
      detail: withinLimit
        ? `Well within ${(PUBLISH_LIMIT_KB / 1024).toFixed(1)}MB limit. Should publish successfully.`
        : `Exceeds ${(PUBLISH_LIMIT_KB / 1024).toFixed(1)}MB limit. Disable more features.`,
      impact: withinLimit ? 'low' : 'critical',
      fix: withinLimit ? undefined : 'Disable ENABLE_AI and ENABLE_HEAVY_EXPORTS',
    });

    // 4b. Edge function count — major publish bottleneck
    const EDGE_FN_COUNT = 110;
    results.push({
      id: 'edge-fn-count',
      label: `${EDGE_FN_COUNT}+ Edge Functions to deploy`,
      status: EDGE_FN_COUNT > 80 ? 'fail' : EDGE_FN_COUNT > 40 ? 'warn' : 'pass',
      detail: `Each function gets bundled separately during publish. ${EDGE_FN_COUNT}+ functions can cause deploy timeout or OOM even with a lean frontend build.`,
      impact: 'critical',
      fix: 'Consolidate related functions (e.g., merge all tm-* into one), or upgrade to ci_large instance in Settings → Cloud → Advanced.',
    });

    // 4c. Instance sizing
    results.push({
      id: 'instance-size',
      label: 'CI instance: ci_medium',
      status: EDGE_FN_COUNT > 80 ? 'warn' : 'pass',
      detail: EDGE_FN_COUNT > 80
        ? 'ci_medium may not have enough RAM for 110+ edge functions + frontend build. Consider ci_large.'
        : 'ci_medium should be sufficient.',
      impact: EDGE_FN_COUNT > 80 ? 'high' : 'low',
      fix: EDGE_FN_COUNT > 80 ? 'Go to Settings → Cloud → Advanced settings → Upgrade to ci_large' : undefined,
    });

    // 5. Dynamic import check for heavy libs
    const staticHeavy = HEAVY_DEPS.filter(d => !d.dynamic && d.used);
    if (staticHeavy.length > 6) {
      results.push({
        id: 'static-heavy-deps',
        label: `${staticHeavy.length} heavy deps loaded statically`,
        status: 'warn',
        detail: `${staticHeavy.map(d => d.name).join(', ')} — consider dynamic import() for rarely-used ones.`,
        impact: 'medium',
      });
    }

    return results;
  }, []);

  const blockers = checks.filter(c => c.status === 'fail');
  const warnings = checks.filter(c => c.status === 'warn');
  const passed = checks.filter(c => c.status === 'pass');

  const overallStatus = blockers.length > 0 ? 'blocked' : warnings.length > 0 ? 'caution' : 'ready';

  const toggle = (section: string) => setExpandedSection(prev => prev === section ? null : section);

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-destructive/10">
          <Skull size={24} className="text-destructive" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Publish Diagnostics</h1>
          <p className="text-sm text-muted-foreground">Ruthless analysis of what blocks your build</p>
        </div>
      </div>

      {/* Overall Status Banner */}
      <div className={`rounded-xl border-2 p-5 mb-6 ${
        overallStatus === 'ready' ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800' :
        overallStatus === 'caution' ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800' :
        'bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-800'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {overallStatus === 'ready' ? <CheckCircle2 size={32} className="text-emerald-600" /> :
             overallStatus === 'caution' ? <AlertTriangle size={32} className="text-amber-600" /> :
             <XCircle size={32} className="text-red-600" />}
            <div>
              <h2 className={`text-xl font-bold ${
                overallStatus === 'ready' ? 'text-emerald-700 dark:text-emerald-400' :
                overallStatus === 'caution' ? 'text-amber-700 dark:text-amber-400' :
                'text-red-700 dark:text-red-400'
              }`}>
                {overallStatus === 'ready' ? '✅ READY TO PUBLISH' :
                 overallStatus === 'caution' ? '⚠️ PUBLISH WITH CAUTION' :
                 '🚫 BLOCKED — WILL OOM'}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {blockers.length} blocker{blockers.length !== 1 ? 's' : ''} · {warnings.length} warning{warnings.length !== 1 ? 's' : ''} · {passed.length} passed
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Build mode</div>
            <div className={`text-sm font-bold ${ENABLE_FULL_APP ? 'text-red-600' : 'text-emerald-600'}`}>
              {ENABLE_FULL_APP ? 'FULL (dangerous)' : 'LEAN (publish-safe)'}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Skull} label="Blockers" value={blockers.length} color={blockers.length > 0 ? 'text-red-600' : 'text-emerald-600'} />
        <StatCard icon={Flame} label="Stubbed Modules" value={STUBBED_MODULES.length} color="text-blue-600" />
        <StatCard icon={Cpu} label="Est. Build" value={`${(CORE_BUNDLE_KB / 1024).toFixed(1)}MB`} color="text-foreground" />
        <StatCard icon={MemoryStick} label="Eliminated" value={`${(TOTAL_STUBBED_KB / 1024).toFixed(1)}MB`} color="text-emerald-600" />
      </div>

      {/* Blockers Section */}
      {blockers.length > 0 && (
        <CollapsibleSection
          title={`🚫 Blockers (${blockers.length})`}
          expanded={expandedSection === 'blockers'}
          onToggle={() => toggle('blockers')}
          variant="destructive"
        >
          {blockers.map(c => <CheckRow key={c.id} check={c} />)}
        </CollapsibleSection>
      )}

      {/* Warnings Section */}
      {warnings.length > 0 && (
        <CollapsibleSection
          title={`⚠️ Warnings (${warnings.length})`}
          expanded={expandedSection === 'warnings'}
          onToggle={() => toggle('warnings')}
          variant="warning"
        >
          {warnings.map(c => <CheckRow key={c.id} check={c} />)}
        </CollapsibleSection>
      )}

      {/* Passed Section */}
      <CollapsibleSection
        title={`✅ Passed (${passed.length})`}
        expanded={expandedSection === 'passed'}
        onToggle={() => toggle('passed')}
        variant="success"
      >
        {passed.map(c => <CheckRow key={c.id} check={c} />)}
      </CollapsibleSection>

      {/* Stubbed Modules Detail */}
      <CollapsibleSection
        title={`🔌 Stubbed Modules (${STUBBED_MODULES.length})`}
        expanded={expandedSection === 'stubs'}
        onToggle={() => toggle('stubs')}
        variant="info"
      >
        <div className="space-y-1">
          {['routes', 'sidebar', 'header', 'panel'].map(type => {
            const mods = STUBBED_MODULES.filter(m => m.type === type);
            const totalKB = mods.reduce((s, m) => s + m.estimatedKB, 0);
            return (
              <div key={type} className="mb-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {type}s — ~{totalKB}KB eliminated
                </div>
                {mods.map(m => (
                  <div key={m.name} className="flex items-center justify-between py-1.5 px-3 rounded hover:bg-muted/50 text-sm">
                    <div>
                      <span className="font-mono text-xs text-foreground">{m.name}</span>
                      <span className="text-muted-foreground text-xs ml-2">— {m.desc}</span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">{m.estimatedKB}KB</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* Heavy Dependencies */}
      <CollapsibleSection
        title={`📦 Heavy Dependencies (${HEAVY_DEPS.length})`}
        expanded={expandedSection === 'deps'}
        onToggle={() => toggle('deps')}
        variant="info"
      >
        <div className="space-y-1">
          {HEAVY_DEPS.sort((a, b) => b.sizeKB - a.sizeKB).map(dep => (
            <div key={dep.name} className="flex items-center justify-between py-1.5 px-3 rounded hover:bg-muted/50">
              <div className="flex items-center gap-2">
                <Package size={12} className={dep.dynamic ? 'text-emerald-600' : 'text-amber-600'} />
                <span className="font-mono text-xs text-foreground">{dep.name}</span>
                {dep.dynamic && (
                  <span className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-medium">
                    dynamic
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${dep.dynamic ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min((dep.sizeKB / 500) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-muted-foreground w-14 text-right">{dep.sizeKB}KB</span>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Architecture Summary */}
      <div className="mt-6 rounded-lg border bg-card p-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
          <Shield size={14} /> Publish Architecture
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
          <div>
            <h4 className="font-semibold text-foreground mb-1">Lean Build (Publish)</h4>
            <ul className="space-y-1">
              <li>✅ Auth + Login page</li>
              <li>✅ ForYou page (core dashboard)</li>
              <li>✅ Admin panel (feature flags + diagnostics)</li>
              <li>✅ Core UI components (Radix, Tailwind)</li>
              <li>❌ 700+ routes → stubbed</li>
              <li>❌ 15 sidebars → stubbed</li>
              <li>❌ 9 header panels → stubbed</li>
              <li>❌ 3 heavy panels → stubbed</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">Full Build (Dev/Vercel)</h4>
            <ul className="space-y-1">
              <li>✅ Everything in lean build</li>
              <li>✅ All 700+ routes loaded</li>
              <li>✅ All sidebars active</li>
              <li>✅ All header components</li>
              <li>✅ All feature modules</li>
              <li className="text-amber-600 font-medium">⚠️ Requires VITE_ENABLE_FULL_APP=true</li>
              <li className="text-amber-600 font-medium">⚠️ Requires 4GB+ RAM (Vercel/local)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={color} />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function CollapsibleSection({ title, expanded, onToggle, children, variant }: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  variant: 'destructive' | 'warning' | 'success' | 'info';
}) {
  const borderColor = {
    destructive: 'border-red-200 dark:border-red-800',
    warning: 'border-amber-200 dark:border-amber-800',
    success: 'border-emerald-200 dark:border-emerald-800',
    info: 'border-border',
  }[variant];

  return (
    <div className={`rounded-lg border ${borderColor} mb-3 overflow-hidden`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
      >
        <span>{title}</span>
        <ChevronRight size={14} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && <div className="px-4 pb-3 border-t">{children}</div>}
    </div>
  );
}

function CheckRow({ check }: { check: DiagnosticCheck }) {
  const statusIcon = {
    pass: <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />,
    warn: <AlertTriangle size={14} className="text-amber-600 shrink-0" />,
    fail: <XCircle size={14} className="text-red-600 shrink-0" />,
    info: <Zap size={14} className="text-blue-600 shrink-0" />,
  }[check.status];

  return (
    <div className="flex items-start gap-2 py-2 border-b last:border-0">
      {statusIcon}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-foreground">{check.label}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{check.detail}</div>
        {check.fix && (
          <div className="mt-1 text-[10px] font-medium text-primary flex items-center gap-1">
            <ArrowRight size={10} /> {check.fix}
          </div>
        )}
      </div>
      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
        check.impact === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
        check.impact === 'high' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
        check.impact === 'medium' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
        'bg-muted text-muted-foreground'
      }`}>
        {check.impact}
      </span>
    </div>
  );
}
