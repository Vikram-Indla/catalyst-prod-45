/**
 * Response Component Renderer
 * Renders rich AI response components (metrics, charts, tables, etc.)
 */

import React from 'react';
import { BarChart, TrendingUp, FileText, Plus, AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ResponseComponent, MetricsCardComponent, ChartComponent, TableComponent, ActionButtonsComponent, AlertComponent } from '../types';

interface ResponseComponentRendererProps {
  component: ResponseComponent;
}

export function ResponseComponentRenderer({ component }: ResponseComponentRendererProps) {
  switch (component.type) {
    case 'metrics_card':
      return <MetricsCard component={component} />;
    case 'chart':
      return <ChartCard component={component} />;
    case 'table':
      return <TableCard component={component} />;
    case 'action_buttons':
      return <ActionButtons component={component} />;
    case 'alert':
      return <AlertCard component={component} />;
    default:
      return null;
  }
}

function MetricsCard({ component }: { component: MetricsCardComponent }) {
  const variantColors: Record<string, string> = {
    teal: 'text-[#0d9488]',
    primary: 'text-[#2563eb]',
    danger: 'text-[#ef4444]',
    warning: 'text-[#d97706]',
    default: 'text-slate-900',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-1.5 bg-[#0d9488]/10 rounded-lg">
          <TrendingUp className="w-4 h-4 text-[#0d9488]" />
        </div>
        <h3 className="font-semibold text-slate-900">{component.title}</h3>
      </div>
      <div className="flex gap-8">
        {component.metrics.map((metric, index) => (
          <div key={index}>
            <div className={cn(
              "text-3xl font-bold",
              variantColors[metric.variant || 'default']
            )}>
              {metric.value}
            </div>
            <div className="text-[13px] text-slate-500 mt-2">
              {metric.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartCard({ component }: { component: ChartComponent }) {
  const maxValue = Math.max(...component.data.values);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-1.5 bg-[#0d9488]/10 rounded-lg">
          <BarChart className="w-4 h-4 text-[#0d9488]" />
        </div>
        <h3 className="font-semibold text-slate-900">{component.title}</h3>
      </div>
      
      {component.chartType === 'bar' && (
        <div className="flex items-end gap-5 h-28">
          {component.data.labels.map((label, index) => {
            const value = component.data.values[index];
            const height = (value / maxValue) * 100;
            const color = value >= 80 ? '#0d9488' : value >= 60 ? '#d97706' : '#ef4444';
            
            return (
              <div key={index} className="flex flex-col items-center gap-2 flex-1">
                <div
                  className="w-9 rounded-t transition-all duration-500"
                  style={{ 
                    height: `${height}%`, 
                    backgroundColor: color,
                    minHeight: '8px',
                  }}
                />
                <span className="text-xs text-slate-500 text-center">{label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TableCard({ component }: { component: TableComponent }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {component.title && (
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">{component.title}</h3>
        </div>
      )}
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50">
            {component.columns.map((col, i) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide",
                  col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {component.rows.slice(0, component.maxRows || 10).map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-slate-100">
              {component.columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-sm text-slate-700",
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                  )}
                >
                  {col.key === 'severity' ? (
                    <SeverityBadge severity={row[col.key]} />
                  ) : (
                    row[col.key]
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    Critical: 'bg-red-100 text-red-700',
    High: 'bg-orange-100 text-orange-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Low: 'bg-green-100 text-green-700',
  };
  
  return (
    <span className={cn(
      "px-2 py-0.5 text-xs font-medium rounded-full",
      colors[severity] || 'bg-slate-100 text-slate-700'
    )}>
      {severity}
    </span>
  );
}

function ActionButtons({ component }: { component: ActionButtonsComponent }) {
  const iconMap: Record<string, React.ReactNode> = {
    'file-text': <FileText className="w-4 h-4" />,
    'plus': <Plus className="w-4 h-4" />,
    'shield-check': <CheckCircle2 className="w-4 h-4" />,
    'alert-circle': <AlertCircle className="w-4 h-4" />,
  };

  return (
    <div className={cn(
      "flex gap-2",
      component.layout === 'vertical' ? 'flex-col items-start' : 'flex-row'
    )}>
      {component.buttons.map((btn) => (
        <Button
          key={btn.id}
          variant="outline"
          className={cn(
            "h-10 px-4 text-[13px] font-medium gap-2",
            btn.variant === 'primary' 
              ? "border-[#2563eb] text-[#2563eb] hover:bg-[#2563eb]/5"
              : "border-slate-200 text-slate-600 hover:bg-slate-50"
          )}
        >
          {btn.icon && iconMap[btn.icon]}
          {btn.label}
        </Button>
      ))}
    </div>
  );
}

function AlertCard({ component }: { component: AlertComponent }) {
  const variants = {
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: Info, color: 'text-blue-600' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle, color: 'text-amber-600' },
    error: { bg: 'bg-red-50', border: 'border-red-200', icon: AlertCircle, color: 'text-red-600' },
    success: { bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle2, color: 'text-green-600' },
  };

  const v = variants[component.variant];
  const Icon = v.icon;

  return (
    <div className={cn("p-4 rounded-xl border", v.bg, v.border)}>
      <div className="flex gap-3">
        <Icon className={cn("w-5 h-5 mt-0.5", v.color)} />
        <div>
          <h4 className="font-semibold text-slate-900">{component.title}</h4>
          <p className="text-sm text-slate-600 mt-1">{component.message}</p>
        </div>
      </div>
    </div>
  );
}
