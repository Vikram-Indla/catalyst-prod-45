import React, { useMemo } from 'react';
import { useFeatureFlags } from '@/contexts/FeatureFlagContext';
import {
  Activity, AlertTriangle, CheckCircle2, XCircle, Zap, HardDrive,
  TrendingDown, TrendingUp, ArrowRight, Shield, Package, Gauge,
  Server, Clock, BarChart3, Lightbulb, RefreshCw
} from 'lucide-react';

/**
 * Module weight estimates (KB) — approximate bundle cost when enabled.
 * These are heuristic estimates based on route counts, component density,
 * and heavy library dependencies per module.
 */
const MODULE_WEIGHTS: Record<string, { routes: number; components: number; bundleKB: number; heavyDeps: string[] }> = {
  producthub:     { routes: 45, components: 60, bundleKB: 380, heavyDeps: ['recharts', 'd3'] },
  testhub:        { routes: 35, components: 50, bundleKB: 320, heavyDeps: ['@tanstack/react-table'] },
  incidenthub:    { routes: 20, components: 35, bundleKB: 240, heavyDeps: [] },
  releasehub:     { routes: 15, components: 25, bundleKB: 180, heavyDeps: [] },
  projecthub:     { routes: 40, components: 55, bundleKB: 350, heavyDeps: ['recharts', '@hello-pangea/dnd'] },
  strategyhub:    { routes: 25, components: 40, bundleKB: 280, heavyDeps: ['d3'] },
  planhub:        { routes: 30, components: 45, bundleKB: 300, heavyDeps: ['recharts'] },
  demandhub:      { routes: 20, components: 30, bundleKB: 220, heavyDeps: [] },
  ai_features:    { routes: 15, components: 25, bundleKB: 450, heavyDeps: ['react-markdown', '@tiptap/*'] },
  wiki:           { routes: 10, components: 20, bundleKB: 280, heavyDeps: ['@tiptap/*', 'react-markdown'] },
  knowledge_hub:  { routes: 12, components: 18, bundleKB: 200, heavyDeps: [] },
  admin:          { routes: 50, components: 70, bundleKB: 400, heavyDeps: ['@tanstack/react-table', 'recharts'] },
  reports:        { routes: 10, components: 20, bundleKB: 350, heavyDeps: ['jspdf', 'exceljs', 'pptxgenjs', 'html2canvas'] },
};

const LOVABLE_PUBLISH_LIMIT_KB = 3500; // Heuristic: Lovable publish starts struggling around 3.5MB
const LOVABLE_SAFE_ZONE_KB = 2800;     // Safe zone for reliable publishes
const CORE_BUNDLE_KB = 650;            // Auth, shell, for-you, core libs (always loaded)

type HealthLevel = 'healthy' | 'warning' | 'critical';

function getHealthLevel(totalKB: number): HealthLevel {
  if (totalKB <= LOVABLE_SAFE_ZONE_KB) return 'healthy';
  if (totalKB <= LOVABLE_PUBLISH_LIMIT_KB) return 'warning';
  return 'critical';
}

const healthColors: Record<HealthLevel, string> = {
  healthy: 'text-emerald-600',
  warning: 'text-amber-600',
  critical: 'text-red-600',
};

const healthBg: Record<HealthLevel, string> = {
  healthy: 'bg-emerald-50 border-emerald-200',
  warning: 'bg-amber-50 border-amber-200',
  critical: 'bg-red-50 border-red-200',
};

const healthBarColor: Record<HealthLevel, string> = {
  healthy: 'bg-emerald-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
};

interface Recommendation {
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  savings?: number;
  action?: string;
}

export default function DeploymentHealthPage() {
  const { allFlags, isLoading } = useFeatureFlags();

  const analysis = useMemo(() => {
    const enabledModules = allFlags.filter(f => f.is_enabled);
    const disabledModules = allFlags.filter(f => !f.is_enabled);

    let enabledBundleKB = CORE_BUNDLE_KB;
    const moduleBreakdown: { key: string; label: string; kb: number; enabled: boolean; heavyDeps: string[] }[] = [];

    allFlags.forEach(f => {
      const weight = MODULE_WEIGHTS[f.module_key];
      if (weight) {
        moduleBreakdown.push({
          key: f.module_key,
          label: f.label,
          kb: weight.bundleKB,
          enabled: f.is_enabled,
          heavyDeps: weight.heavyDeps,
        });
        if (f.is_enabled) enabledBundleKB += weight.bundleKB;
      }
    });

    // Sort by bundle size desc
    moduleBreakdown.sort((a, b) => b.kb - a.kb);

    const health = getHealthLevel(enabledBundleKB);
    const overBudget = enabledBundleKB - LOVABLE_PUBLISH_LIMIT_KB;
    const utilizationPct = Math.min((enabledBundleKB / LOVABLE_PUBLISH_LIMIT_KB) * 100, 100);

    // Generate recommendations
    const recommendations: Recommendation[] = [];

    if (health === 'critical') {
      // Find biggest enabled modules to suggest disabling
      const sortedEnabled = moduleBreakdown.filter(m => m.enabled).sort((a, b) => b.kb - a.kb);
      let cumulativeSavings = 0;
      const toDisable: string[] = [];
      for (const m of sortedEnabled) {
        if (cumulativeSavings >= overBudget) break;
        toDisable.push(m.label);
        cumulativeSavings += m.kb;
      }
      recommendations.push({
        type: 'critical',
        title: `Over budget by ~${overBudget}KB`,
        description: `Disable ${toDisable.slice(0, 3).join(', ')} to bring bundle under the publish limit.`,
        savings: cumulativeSavings,
        action: 'Disable heavy modules in Feature Flags',
      });
    }

    if (health === 'warning') {
      recommendations.push({
        type: 'warning',
        title: 'Approaching publish limit',
        description: 'You\'re in the yellow zone. Adding more modules may cause publish timeouts.',
      });
    }

    // Check for heavy dependency overlap
    const heavyDepsEnabled = moduleBreakdown
      .filter(m => m.enabled)
      .flatMap(m => m.heavyDeps);
    const uniqueHeavyDeps = [...new Set(heavyDepsEnabled)];
    if (uniqueHeavyDeps.length > 4) {
      recommendations.push({
        type: 'warning',
        title: `${uniqueHeavyDeps.length} heavy dependencies active`,
        description: `Libraries like ${uniqueHeavyDeps.slice(0, 3).join(', ')} add significant weight. Consider disabling modules that share these deps.`,
      });
    }

    // Reports module warning (dynamic imports)
    const reportsEnabled = moduleBreakdown.find(m => m.key === 'reports' && m.enabled);
    if (reportsEnabled) {
      recommendations.push({
        type: 'info',
        title: 'Reports module uses dynamic imports',
        description: 'jspdf, exceljs, pptxgenjs load on-demand. Actual initial bundle impact is lower than estimated.',
      });
    }

    // AI features warning
    const aiEnabled = moduleBreakdown.find(m => m.key === 'ai_features' && m.enabled);
    if (aiEnabled) {
      recommendations.push({
        type: 'info',
        title: 'AI Features include edge function calls',
        description: 'AI processing happens server-side. Client bundle is mostly UI components, keeping the actual weight manageable.',
      });
    }

    if (health === 'healthy' && enabledModules.length > 0) {
      recommendations.push({
        type: 'info',
        title: 'You\'re in the safe zone ✓',
        description: `Current bundle (~${(enabledBundleKB / 1024).toFixed(1)}MB) is well within Lovable's publish limit. You can safely enable more modules.`,
      });
    }

    const totalRoutes = enabledModules.reduce((sum, f) => {
      const w = MODULE_WEIGHTS[f.module_key];
      return sum + (w?.routes || 0);
    }, 5); // 5 core routes

    const totalComponents = enabledModules.reduce((sum, f) => {
      const w = MODULE_WEIGHTS[f.module_key];
      return sum + (w?.components || 0);
    }, 15); // core components

    return {
      enabledBundleKB,
      health,
      utilizationPct,
      enabledCount: enabledModules.length,
      disabledCount: disabledModules.length,
      moduleBreakdown,
      recommendations,
      totalRoutes,
      totalComponents,
      uniqueHeavyDeps: uniqueHeavyDeps.length,
    };
  }, [allFlags]);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <RefreshCw className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  const { health, enabledBundleKB, utilizationPct, moduleBreakdown, recommendations } = analysis;

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">Deployment Health</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor bundle weight and publish readiness for Lovable deployment.
          </p>
        </div>
      </div>

      {/* Health Score Card */}
      <div className={`rounded-xl border-2 p-6 mb-6 ${healthBg[health]}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`rounded-full p-3 ${health === 'healthy' ? 'bg-emerald-100' : health === 'warning' ? 'bg-amber-100' : 'bg-red-100'}`}>
              {health === 'healthy' ? <CheckCircle2 size={28} className="text-emerald-600" /> :
               health === 'warning' ? <AlertTriangle size={28} className="text-amber-600" /> :
               <XCircle size={28} className="text-red-600" />}
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${healthColors[health]}`}>
                {health === 'healthy' ? 'Ready to Publish' :
                 health === 'warning' ? 'Publish with Caution' :
                 'Too Heavy to Publish'}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Estimated bundle: <strong>{(enabledBundleKB / 1024).toFixed(1)}MB</strong> / {(LOVABLE_PUBLISH_LIMIT_KB / 1024).toFixed(1)}MB limit
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-black ${healthColors[health]}`}>
              {Math.round(100 - utilizationPct)}%
            </div>
            <div className="text-xs text-muted-foreground">headroom</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-3 rounded-full bg-white/60 overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all duration-700 ${healthBarColor[health]}`}
              style={{ width: `${Math.min(utilizationPct, 100)}%` }}
            />
            {/* Safe zone marker */}
            <div
              className="absolute top-0 h-full w-px bg-emerald-400/60"
              style={{ left: `${(LOVABLE_SAFE_ZONE_KB / LOVABLE_PUBLISH_LIMIT_KB) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
            <span>0MB</span>
            <span className="text-emerald-600">Safe ({(LOVABLE_SAFE_ZONE_KB / 1024).toFixed(1)}MB)</span>
            <span className={healthColors[health]}>Limit ({(LOVABLE_PUBLISH_LIMIT_KB / 1024).toFixed(1)}MB)</span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Active Modules', value: analysis.enabledCount, icon: Package, color: 'text-primary' },
          { label: 'Disabled', value: analysis.disabledCount, icon: XCircle, color: 'text-muted-foreground' },
          { label: 'Routes', value: `~${analysis.totalRoutes}`, icon: Server, color: 'text-blue-600' },
          { label: 'Components', value: `~${analysis.totalComponents}`, icon: Gauge, color: 'text-violet-600' },
          { label: 'Heavy Deps', value: analysis.uniqueHeavyDeps, icon: HardDrive, color: 'text-amber-600' },
        ].map(stat => (
          <div key={stat.label} className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon size={14} className={stat.color} />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="text-xl font-bold text-foreground">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Module Weight Breakdown */}
        <div className="lg:col-span-3">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 size={14} /> Module Weight Breakdown
          </h2>
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="grid grid-cols-[1fr_80px_80px_60px] gap-2 px-4 py-2 border-b bg-muted/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Module</span>
              <span className="text-right">Bundle</span>
              <span className="text-right">Routes</span>
              <span className="text-center">Status</span>
            </div>
            {moduleBreakdown.map(m => {
              const weight = MODULE_WEIGHTS[m.key];
              const pctOfTotal = (m.kb / LOVABLE_PUBLISH_LIMIT_KB) * 100;
              return (
                <div key={m.key} className={`grid grid-cols-[1fr_80px_80px_60px] gap-2 px-4 py-2.5 border-b last:border-0 items-center ${m.enabled ? '' : 'opacity-50'}`}>
                  <div>
                    <div className="text-sm font-medium text-foreground">{m.label}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="h-1.5 rounded-full bg-muted flex-1 max-w-[120px] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${m.enabled ? (pctOfTotal > 10 ? 'bg-amber-500' : 'bg-primary') : 'bg-muted-foreground/30'}`}
                          style={{ width: `${Math.min(pctOfTotal * 3, 100)}%` }}
                        />
                      </div>
                      {m.heavyDeps.length > 0 && (
                        <span className="text-[9px] text-amber-600 font-medium">
                          {m.heavyDeps.length} heavy deps
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs font-mono text-muted-foreground">{m.kb}KB</div>
                  <div className="text-right text-xs text-muted-foreground">{weight?.routes || '—'}</div>
                  <div className="text-center">
                    {m.enabled ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700">
                        <TrendingUp size={8} /> On
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                        <TrendingDown size={8} /> Off
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {/* Total row */}
            <div className="grid grid-cols-[1fr_80px_80px_60px] gap-2 px-4 py-2.5 bg-muted/30 border-t font-semibold items-center">
              <div className="text-sm text-foreground">Total (enabled + core)</div>
              <div className="text-right text-xs font-mono text-foreground">{enabledBundleKB}KB</div>
              <div className="text-right text-xs text-foreground">~{analysis.totalRoutes}</div>
              <div />
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Lightbulb size={14} /> Recommendations
          </h2>
          <div className="space-y-3">
            {recommendations.map((rec, i) => {
              const recColors = {
                critical: 'border-red-200 bg-red-50',
                warning: 'border-amber-200 bg-amber-50',
                info: 'border-blue-200 bg-blue-50',
              };
              const recIcons = {
                critical: <XCircle size={14} className="text-red-600 shrink-0" />,
                warning: <AlertTriangle size={14} className="text-amber-600 shrink-0" />,
                info: <Zap size={14} className="text-blue-600 shrink-0" />,
              };
              return (
                <div key={i} className={`rounded-lg border p-3 ${recColors[rec.type]}`}>
                  <div className="flex items-start gap-2">
                    {recIcons[rec.type]}
                    <div>
                      <h3 className="text-xs font-semibold text-foreground">{rec.title}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{rec.description}</p>
                      {rec.savings && (
                        <div className="mt-1.5 text-[10px] font-medium text-emerald-700">
                          Potential savings: ~{rec.savings}KB
                        </div>
                      )}
                      {rec.action && (
                        <a
                          href="/admin/feature-flags"
                          className="inline-flex items-center gap-1 mt-2 text-[10px] font-medium text-primary hover:underline"
                        >
                          {rec.action} <ArrowRight size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Publish Strategy Guide */}
          <div className="mt-4 rounded-lg border bg-card p-4">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-2 mb-2">
              <Shield size={12} /> Incremental Publish Strategy
            </h3>
            <ol className="space-y-2 text-[11px] text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="shrink-0 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold mt-0.5">1</span>
                <span>Start with all modules <strong>disabled</strong>. Publish the lean core (auth + For You).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold mt-0.5">2</span>
                <span>Enable <strong>1–2 modules</strong> at a time. Check the health gauge stays green.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold mt-0.5">3</span>
                <span>Publish after each batch. If it fails, disable the last batch and try smaller increments.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold mt-0.5">4</span>
                <span>Keep <strong>Reports</strong> & <strong>AI</strong> for last — they carry the heaviest dependencies.</span>
              </li>
            </ol>
          </div>

          {/* Clock indicator */}
          <div className="mt-3 rounded-lg border bg-muted/30 p-3 flex items-center gap-2">
            <Clock size={14} className="text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">
              Lovable publish timeout is ~120s. Bundles over 3.5MB frequently exceed this.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
