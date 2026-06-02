/**
 * Gap Detection Grid Component
 * Shows pages/components not aligned with design system baseline
 */

import { useState, useMemo } from 'react';
import Button from '@atlaskit/button/new';
import AdsSelect from '@atlaskit/select';
import { Lozenge, Tooltip, type LozengeAppearance } from '@/components/ads';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import AutomationIcon from '@atlaskit/icon/core/automation';
import CopyIcon from '@atlaskit/icon/core/copy';
import FileIcon from '@atlaskit/icon/core/file';
import FilterIcon from '@atlaskit/icon/core/filter';
import PhoneIcon from '@atlaskit/icon/core/phone';
import SendIcon from '@atlaskit/icon/core/send';
import ToolsIcon from '@atlaskit/icon/core/tools';
import WarningIcon from '@atlaskit/icon/core/warning';
import { 
  detectedGaps, 
  responsivenessGaps,
  type DesignGap,
  type ResponsivenessGap,
} from '@/lib/designAudit/designSystemBaseline';
import { catalystToast } from '@/lib/catalystToast';

interface GapDetectionGridProps {
  onFixSelected?: (gaps: DesignGap[]) => void;
}

// Generate fix instruction for a gap
function generateFixInstruction(gap: DesignGap | ResponsivenessGap): string {
  if ('component' in gap) {
    // Design gap
    return `Fix design system gap in ${gap.file || gap.component}:

**Issue:** ${gap.component} uses ${gap.property}: ${gap.current}
**Expected:** ${gap.property}: ${gap.expected} (per design baseline)
**Route:** ${gap.route}
**Category:** ${gap.category}
**Severity:** ${gap.severity}

Please update the ${gap.property} value from "${gap.current}" to "${gap.expected}" to align with the Catalyst design system baseline.`;
  } else {
    // Responsiveness gap
    return `Fix responsive issue on ${gap.route}:

**Route:** ${gap.route}
**Viewport:** ${gap.viewport}
**Score:** ${gap.score}%
**Issues:** ${gap.issues} (P0: ${gap.p0}, P1: ${gap.p1})
**Top Issue:** ${gap.topIssue}

Please fix the "${gap.topIssue}" responsiveness issue on ${gap.route} at ${gap.viewport} viewport. Ensure the layout doesn't overflow, elements are properly sized, and touch targets meet minimum 44px requirements.`;
  }
}

// Copy instruction to clipboard and show toast
async function copyFixInstruction(gap: DesignGap | ResponsivenessGap) {
  const instruction = generateFixInstruction(gap);
  try {
    await navigator.clipboard.writeText(instruction);
    catalystToast.success('Fix instruction copied! Paste it in the chat to fix this issue.');
  } catch {
    catalystToast.error('Failed to copy instruction');
  }
}

export function GapDetectionGrid({ onFixSelected }: GapDetectionGridProps) {
  const [selectedGaps, setSelectedGaps] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [showResponsive, setShowResponsive] = useState(false);

  // Filter gaps
  const filteredGaps = useMemo(() => {
    return detectedGaps.filter(gap => {
      if (categoryFilter !== 'all' && gap.category !== categoryFilter) return false;
      if (severityFilter !== 'all' && gap.severity !== severityFilter) return false;
      return true;
    });
  }, [categoryFilter, severityFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: detectedGaps.length,
    p0: detectedGaps.filter(g => g.severity === 'P0').length,
    p1: detectedGaps.filter(g => g.severity === 'P1').length,
    p2: detectedGaps.filter(g => g.severity === 'P2').length,
    p3: detectedGaps.filter(g => g.severity === 'P3').length,
    autoFixable: detectedGaps.filter(g => g.autoFixable).length,
    responsive: responsivenessGaps.length,
  }), []);

  const toggleGap = (id: string) => {
    const newSet = new Set(selectedGaps);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedGaps(newSet);
  };

  const selectAll = () => {
    if (selectedGaps.size === filteredGaps.length) {
      setSelectedGaps(new Set());
    } else {
      setSelectedGaps(new Set(filteredGaps.map(g => g.id)));
    }
  };

  const handleFixSelected = () => {
    const gaps = detectedGaps.filter(g => selectedGaps.has(g.id));
    const autoFixable = gaps.filter(g => g.autoFixable);
    const manual = gaps.filter(g => !g.autoFixable);
    
    if (autoFixable.length > 0) {
      catalystToast.success(`Queued ${autoFixable.length} auto-fixable issues for repair`);
    }
    if (manual.length > 0) {
      catalystToast.info(`${manual.length} issues require manual intervention`);
    }
    
    onFixSelected?.(gaps);
  };

  const getSeverityAppearance = (severity: string): LozengeAppearance => {
    switch (severity) {
      case 'P0': return 'removed';
      case 'P1': return 'moved';
      case 'P2': return 'inprogress';
      case 'P3': return 'default';
      default: return 'default';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'color': return <div className="h-3 w-3 rounded bg-brand-primary" />;
      case 'spacing': return <div className="h-3 w-3 border-2 border-current rounded" />;
      case 'typography': return <span className="text-[10px] ">Aa</span>;
      case 'layout': return <div className="h-3 w-3 grid grid-cols-2 gap-0.5"><div className="bg-current rounded-sm" /><div className="bg-current rounded-sm" /><div className="bg-current rounded-sm" /><div className="bg-current rounded-sm" /></div>;
      case 'component': return <FileIcon label="" size="small" />;
      case 'responsive': return <PhoneIcon label="" size="small" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '12px' }}>
          <div className=" text-foreground">{stats.total}</div>
          <div className=" text-muted-foreground">Total Gaps</div>
        </div>
        <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '12px' }}>
          <div className=" text-destructive">{stats.p0}</div>
          <div className=" text-muted-foreground">P0 Critical</div>
        </div>
        <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '12px' }}>
          <div className=" text-warning">{stats.p1}</div>
          <div className=" text-muted-foreground">P1 Major</div>
        </div>
        <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '12px' }}>
          <div className=" text-info">{stats.p2}</div>
          <div className=" text-muted-foreground">P2 Medium</div>
        </div>
        <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '12px' }}>
          <div className=" text-muted-foreground">{stats.p3}</div>
          <div className=" text-muted-foreground">P3 Minor</div>
        </div>
        <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '12px' }}>
          <div className=" text-success">{stats.autoFixable}</div>
          <div className=" text-muted-foreground">Auto-fixable</div>
        </div>
        <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '12px' }}>
          <div className=" text-brand-primary">{stats.responsive}</div>
          <div className=" text-muted-foreground">Responsive</div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center ">
          <FilterIcon label="" size="small" />
          <div style={{ width: '160px' }}>
            <AdsSelect
              value={{
                label: categoryFilter === 'all' ? 'All Categories' :
                  categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1),
                value: categoryFilter,
              }}
              options={[
                { label: 'All Categories', value: 'all' },
                { label: 'Color', value: 'color' },
                { label: 'Spacing', value: 'spacing' },
                { label: 'Typography', value: 'typography' },
                { label: 'Layout', value: 'layout' },
                { label: 'Component', value: 'component' },
                { label: 'Responsive', value: 'responsive' },
              ]}
              onChange={(opt) => setCategoryFilter(opt?.value ?? 'all')}
            />
          </div>

          <div style={{ width: '140px' }}>
            <AdsSelect
              value={{
                label: severityFilter === 'all' ? 'All Severity' :
                  severityFilter === 'P0' ? 'P0 Critical' :
                  severityFilter === 'P1' ? 'P1 Major' :
                  severityFilter === 'P2' ? 'P2 Medium' : 'P3 Minor',
                value: severityFilter,
              }}
              options={[
                { label: 'All Severity', value: 'all' },
                { label: 'P0 Critical', value: 'P0' },
                { label: 'P1 Major', value: 'P1' },
                { label: 'P2 Medium', value: 'P2' },
                { label: 'P3 Minor', value: 'P3' },
              ]}
              onChange={(opt) => setSeverityFilter(opt?.value ?? 'all')}
            />
          </div>
        </div>

        <div className="flex-1" />

        <Button
          appearance={showResponsive ? 'primary' : 'default'}
          iconBefore={PhoneIcon}
          onClick={() => setShowResponsive(!showResponsive)}
        >
          Responsive Gaps
        </Button>

        {selectedGaps.size > 0 && (
          <Button appearance="primary" iconBefore={ToolsIcon} onClick={handleFixSelected}>
            Fix Selected ({selectedGaps.size})
          </Button>
        )}
      </div>

      {/* Gap Grid */}
      {!showResponsive ? (
        <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px' }}>
          <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--ds-border-layout, #EBECF0)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base flex items-center " style={{ fontWeight: 500, margin: 0 }}>
                  <WarningIcon label="" size="small" />
                  Design Gaps ({filteredGaps.length})
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--ds-text-subtlest, #626F86)', margin: '4px 0 0' }}>Pages and components not aligned with baseline</p>
              </div>
              <Button appearance="subtle" onClick={selectAll}>
                {selectedGaps.size === filteredGaps.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </div>
          <div>
            <ScrollArea className="h-[400px]">
              <div className="divide-y">
                {filteredGaps.map(gap => (
                  <div
                    key={gap.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors",
                      selectedGaps.has(gap.id) && "bg-brand-primary/5"
                    )}
                  >
                    <Checkbox
                      checked={selectedGaps.has(gap.id)}
                      onCheckedChange={() => toggleGap(gap.id)}
                    />

                    <Lozenge appearance={getSeverityAppearance(gap.severity)}>
                      {gap.severity}
                    </Lozenge>

                    <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
                      {getCategoryIcon(gap.category)}
                      <span className=" capitalize">{gap.category}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center ">
                        <span className="font-medium ">{gap.component}</span>
                        <code className="text-[10px] text-muted-foreground bg-secondary px-1 rounded">
                          {gap.route}
                        </code>
                      </div>
                      <div className=" text-muted-foreground mt-0.5">
                        <span className="text-destructive">{gap.current}</span>
                        {' → '}
                        <span className="text-success">{gap.expected}</span>
                        <span className="ml-2 text-muted-foreground">({gap.property})</span>
                      </div>
                    </div>

                    {gap.autoFixable ? (
                      <Lozenge appearance="success">Auto-fix</Lozenge>
                    ) : (
                      <Lozenge appearance="default">Manual</Lozenge>
                    )}

                    {gap.file && (
                      <code className="text-[10px] text-muted-foreground shrink-0">{gap.file}</code>
                    )}

                    {/* Fix Button */}
                    <Tooltip content="Copy fix instruction to clipboard, then paste in chat to fix this issue" position="left">
                      <Button
                        appearance="default"
                        iconBefore={SendIcon}
                        onClick={() => copyFixInstruction(gap)}
                      >
                        Fix
                      </Button>
                    </Tooltip>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      ) : (
        /* Responsive Gaps View */
        <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px' }}>
          <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--ds-border-layout, #EBECF0)' }}>
            <h3 className="text-base flex items-center " style={{ fontWeight: 500, margin: 0 }}>
              <PhoneIcon label="" size="small" />
              Responsive Gaps ({responsivenessGaps.length})
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--ds-text-subtlest, #626F86)', margin: '4px 0 0' }}>Routes with responsiveness issues by viewport</p>
          </div>
          <div>
            <ScrollArea className="h-[400px]">
              <table className="w-full ">
                <thead className="sticky top-0 border-b" style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))' }}>
                  <tr>
                    <th className="text-left font-medium ">Route</th>
                    <th className="text-left font-medium ">Viewport</th>
                    <th className="text-center font-medium ">Score</th>
                    <th className="text-center font-medium ">Issues</th>
                    <th className="text-center font-medium ">P0/P1</th>
                    <th className="text-left font-medium ">Top Issue</th>
                    <th className="text-right font-medium ">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {responsivenessGaps.map((gap, idx) => (
                    <tr key={idx} className="border-b hover:bg-secondary/30">
                      <td className=" ">
                        <code className=" px-1.5 py-0.5 bg-secondary rounded">{gap.route}</code>
                      </td>
                      <td className=" text-muted-foreground">{gap.viewport}</td>
                      <td className=" text-center">
                        <Lozenge appearance={
                          gap.score >= 80 ? 'success' :
                          gap.score >= 60 ? 'moved' :
                          'removed'
                        }>
                          {gap.score}%
                        </Lozenge>
                      </td>
                      <td className=" text-center font-medium">{gap.issues}</td>
                      <td className=" text-center">
                        {gap.p0 > 0 && <span className="mr-1"><Lozenge appearance="removed">{String(gap.p0)}</Lozenge></span>}
                        {gap.p1 > 0 && <Lozenge appearance="moved">{String(gap.p1)}</Lozenge>}
                        {gap.p0 === 0 && gap.p1 === 0 && <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className=" text-muted-foreground">{gap.topIssue}</td>
                      <td className=" text-right">
                        <Tooltip content="Copy fix instruction to clipboard, then paste in chat" position="left">
                          <Button
                            appearance="default"
                            iconBefore={SendIcon}
                            onClick={() => copyFixInstruction(gap)}
                          >
                            Fix
                          </Button>
                        </Tooltip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
