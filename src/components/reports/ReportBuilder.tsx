import { useState } from 'react';
import { Save, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCreateReport } from '@/hooks/useReportAnalytics';
import { toast } from 'sonner';

interface ReportConfig {
  name: string; description: string; reportType: string; metrics: string[];
  groupBy: string; chartType: string; filters: { dateRange: string };
}

const REPORT_TYPES = [
  { value: 'execution', label: 'Execution Report' },
  { value: 'coverage', label: 'Coverage Report' },
  { value: 'defect', label: 'Defect Report' },
  { value: 'team', label: 'Team Performance' },
];

const METRICS: Record<string, { key: string; label: string }[]> = {
  execution: [
    { key: 'pass_rate', label: 'Pass Rate' }, { key: 'total_executed', label: 'Total Executed' },
    { key: 'passed', label: 'Passed Count' }, { key: 'failed', label: 'Failed Count' },
    { key: 'blocked', label: 'Blocked Count' }, { key: 'execution_time', label: 'Avg Execution Time' },
  ],
  coverage: [
    { key: 'execution_coverage', label: 'Execution Coverage' },
    { key: 'automation_coverage', label: 'Automation Coverage' },
  ],
  defect: [
    { key: 'total_defects', label: 'Total Defects' }, { key: 'open_defects', label: 'Open Defects' },
    { key: 'closed_defects', label: 'Closed Defects' }, { key: 'by_severity', label: 'By Severity' },
  ],
  team: [
    { key: 'tests_executed', label: 'Tests Executed' }, { key: 'pass_rate', label: 'Pass Rate' },
    { key: 'avg_time', label: 'Avg Time per Test' },
  ],
};

const GROUP_BY = [
  { value: 'none', label: 'No Grouping' }, { value: 'folder', label: 'By Folder/Module' },
  { value: 'priority', label: 'By Priority' }, { value: 'tester', label: 'By Tester' },
  { value: 'day', label: 'By Day' }, { value: 'week', label: 'By Week' },
];

const CHART_TYPES = [
  { value: 'bar', label: 'Bar Chart' }, { value: 'line', label: 'Line Chart' },
  { value: 'pie', label: 'Pie Chart' }, { value: 'table', label: 'Table Only' },
];

interface ReportBuilderProps { onClose?: () => void; existingReport?: any; }

export function ReportBuilder({ onClose, existingReport }: ReportBuilderProps) {
  const createReport = useCreateReport();
  const [config, setConfig] = useState<ReportConfig>({
    name: existingReport?.name || '', description: existingReport?.description || '',
    reportType: existingReport?.report_type || 'execution',
    metrics: existingReport?.config?.metrics || ['pass_rate', 'total_executed'],
    groupBy: existingReport?.config?.groupBy || 'none',
    chartType: existingReport?.config?.chartType || 'bar',
    filters: existingReport?.config?.filters || { dateRange: '30' },
  });
  const [showPreview, setShowPreview] = useState(false);
  const availableMetrics = METRICS[config.reportType] || [];

  const handleMetricToggle = (key: string) => {
    setConfig(prev => ({
      ...prev,
      metrics: prev.metrics.includes(key) ? prev.metrics.filter(m => m !== key) : [...prev.metrics, key],
    }));
  };

  const handleSave = async () => {
    if (!config.name.trim()) { toast.error('Please enter a report name'); return; }
    if (config.metrics.length === 0) { toast.error('Please select at least one metric'); return; }
    await createReport.mutateAsync({
      name: config.name, description: config.description, report_type: config.reportType,
      config: { metrics: config.metrics, groupBy: config.groupBy, chartType: config.chartType, filters: config.filters },
    });
    onClose?.();
  };

  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      <div className="space-y-6 overflow-y-auto p-1">
        <Card>
          <CardHeader><CardTitle className="text-base">Report Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Report Name *</Label><Input value={config.name} onChange={e => setConfig({...config, name: e.target.value})} placeholder="e.g., Weekly Execution Summary" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={config.description} onChange={e => setConfig({...config, description: e.target.value})} placeholder="Optional description..." rows={2} /></div>
            <div className="space-y-2"><Label>Report Type</Label>
              <Select value={config.reportType} onValueChange={v => setConfig({...config, reportType: v, metrics: []})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REPORT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Metrics</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {availableMetrics.map(m => (
              <div key={m.key} className="flex items-center gap-2">
                <Checkbox id={m.key} checked={config.metrics.includes(m.key)} onCheckedChange={() => handleMetricToggle(m.key)} />
                <Label htmlFor={m.key} className="font-normal cursor-pointer">{m.label}</Label>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Visualization</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Group By</Label>
              <Select value={config.groupBy} onValueChange={v => setConfig({...config, groupBy: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GROUP_BY.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Chart Type</Label>
              <RadioGroup value={config.chartType} onValueChange={v => setConfig({...config, chartType: v})} className="grid grid-cols-2 gap-2">
                {CHART_TYPES.map(c => (
                  <div key={c.value} className="flex items-center gap-2">
                    <RadioGroupItem value={c.value} id={c.value} />
                    <Label htmlFor={c.value} className="font-normal cursor-pointer">{c.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Date Range</Label>
              <Select value={config.filters.dateRange} onValueChange={v => setConfig({...config, filters: { ...config.filters, dateRange: v }})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="border rounded-lg bg-muted/30 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Preview</h3>
          <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}><Eye className="h-4 w-4 mr-1" />Run Preview</Button>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p>{showPreview ? 'Preview will render here' : 'Configure your report'}</p>
            <p className="text-sm">{showPreview ? 'Based on current configuration' : 'Click "Run Preview" to see results'}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          {onClose && <Button variant="outline" onClick={onClose}>Cancel</Button>}
          <Button onClick={handleSave} disabled={createReport.isPending}>
            <Save className="h-4 w-4 mr-1" />{createReport.isPending ? 'Saving...' : 'Save Report'}
          </Button>
        </div>
      </div>
    </div>
  );
}
