import { useState, useEffect } from 'react';
import { 
  X, Download, FileText, Bug, FileCheck, Layers, Tags,
  RefreshCcw, Database, Filter
} from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExported: () => void;
}

const EXPORT_TYPES = [
  { value: 'test_cases', label: 'Test Cases', icon: FileText, color: 'var(--cp-blue)', table: 'tm_test_cases' },
  { value: 'defects', label: 'Defects', icon: Bug, color: 'var(--sem-danger)', table: 'tm_defects' },
  { value: 'requirements', label: 'Requirements', icon: FileCheck, color: 'var(--sem-success)', table: 'tm_requirements' },
  { value: 'shared_steps', label: 'Shared Steps', icon: Layers, color: 'var(--ds-text-brand, #2563EB)', table: 'tm_shared_steps' },
  { value: 'cycles', label: 'Test Cycles', icon: RefreshCcw, color: '#0891B2', table: 'tm_test_cycles' },
  { value: 'tags', label: 'Tags', icon: Tags, color: '#EC4899', table: 'tm_labels' },
];

const FORMAT_OPTIONS = [
  { value: 'csv', label: 'CSV', description: 'Comma-separated values, works with Excel' },
  { value: 'json', label: 'JSON', description: 'JavaScript Object Notation, for developers' },
];

export function ExportModal({ isOpen, onClose, onExported }: ExportModalProps) {
  const [exportType, setExportType] = useState('test_cases');
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportName, setExportName] = useState('');
  const [includeAll, setIncludeAll] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const typeConfig = EXPORT_TYPES.find(t => t.value === exportType);
      if (!typeConfig) return;

      let query = typedQuery(typeConfig.table).select('id', { count: 'exact', head: true });
      
      if (!includeAll) {
        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }
        if (priorityFilter !== 'all') {
          query = query.eq('priority', priorityFilter);
        }
      }

      const { count } = await query;
      setItemCount(count || 0);
    };

    if (isOpen) {
      fetchCount();
      setExportName(`${exportType}_export_${new Date().toISOString().split('T')[0]}`);
    }
  }, [isOpen, exportType, includeAll, statusFilter, priorityFilter]);

  const handleExport = async () => {
    if (itemCount === 0) {
      catalystToast.error('No data to export');
      return;
    }

    setIsExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const typeConfig = EXPORT_TYPES.find(t => t.value === exportType)!;

      const { data: job, error: jobError } = await typedQuery('th_export_jobs')
        .insert({
          name: exportName || `Export ${new Date().toLocaleDateString()}`,
          type: exportType,
          export_format: exportFormat,
          status: 'processing',
          total_items: itemCount,
          filters: includeAll ? {} : { status: statusFilter, priority: priorityFilter },
          started_at: new Date().toISOString(),
          created_by: user?.id,
        })
        .select()
        .single();

      if (jobError) throw jobError;

      let query = typedQuery(typeConfig.table).select('*');
      
      if (!includeAll) {
        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }
        if (priorityFilter !== 'all') {
          query = query.eq('priority', priorityFilter);
        }
      }

      const { data: exportData, error: dataError } = await query;
      if (dataError) throw dataError;

      let fileContent: string;
      let mimeType: string;
      let fileExtension: string;

      if (exportFormat === 'json') {
        fileContent = JSON.stringify(exportData, null, 2);
        mimeType = 'application/json';
        fileExtension = 'json';
      } else {
        if (!exportData || exportData.length === 0) {
          fileContent = '';
        } else {
          const headers = Object.keys(exportData[0]);
          const rows = exportData.map((row: any) => 
            headers.map(h => {
              const val = row[h];
              if (val === null || val === undefined) return '';
              if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
                return `"${val.replace(/"/g, '""')}"`;
              }
              return val;
            }).join(',')
          );
          fileContent = [headers.join(','), ...rows].join('\n');
        }
        mimeType = 'text/csv';
        fileExtension = 'csv';
      }

      const blob = new Blob([fileContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const fileName = `${exportName}.${fileExtension}`;

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await typedQuery('th_export_jobs')
        .update({
          status: 'completed',
          processed_items: exportData?.length || 0,
          file_name: fileName,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      catalystToast.success(`Exported ${exportData?.length || 0} records`);
      onExported();
      onClose();
    } catch (err) {
      console.error('Export error:', err);
      catalystToast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 550, maxHeight: '90vh', backgroundColor: 'var(--cp-float)',
        borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #14B8A6 0%, var(--sem-success) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Download size={22} style={{ color: 'var(--ds-text-inverse, #FFFFFF)' }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: 0 }}>Export Data</h2>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 50, border: 'none', borderRadius: 8,
            backgroundColor: 'transparent', color: 'var(--fg-3)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* Export Name */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6 }}>Export Name</label>
            <input
              type="text"
              value={exportName}
              onChange={(e) => setExportName(e.target.value)}
              placeholder="my_export"
              style={{ width: '100%', height: 44, padding: '0 14px', border: '1.5px solid var(--divider)', borderRadius: 12, fontSize: 14 }}
            />
          </div>

          {/* Data Type Selection */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 8 }}>What to export</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {EXPORT_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = exportType === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => setExportType(type.value)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      padding: 12, border: `2px solid ${isSelected ? type.color : 'var(--divider)'}`,
                      borderRadius: 12, backgroundColor: isSelected ? `${type.color}10` : 'var(--cp-float)',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon size={20} style={{ color: type.color }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)' }}>{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format Selection */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 8 }}>Format</label>
            <div style={{ display: 'flex', gap: 12 }}>
              {FORMAT_OPTIONS.map((format) => (
                <button
                  key={format.value}
                  onClick={() => setExportFormat(format.value)}
                  style={{
                    flex: 1, padding: 14,
                    border: `2px solid ${exportFormat === format.value ? '#14B8A6' : 'var(--divider)'}`,
                    borderRadius: 12, backgroundColor: exportFormat === format.value ? '#F0FDFA' : 'var(--cp-float)',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)', margin: 0 }}>{format.label}</p>
                  <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '4px 0 0' }}>{format.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 8 }}>
              <Filter size={14} /> Filter Data
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="radio" checked={includeAll} onChange={() => setIncludeAll(true)} style={{ accentColor: '#14B8A6' }} />
                <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>Export all</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="radio" checked={!includeAll} onChange={() => setIncludeAll(false)} style={{ accentColor: '#14B8A6' }} />
                <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>Apply filters</span>
              </label>
            </div>
            
            {!includeAll && (
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--fg-3)', marginBottom: 4 }}>Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ width: '100%', height: 50, padding: '0 10px', border: '1px solid var(--divider)', borderRadius: 6, fontSize: 13 }}
                  >
                    <option value="all">All</option>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--fg-3)', marginBottom: 4 }}>Priority</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    style={{ width: '100%', height: 50, padding: '0 10px', border: '1px solid var(--divider)', borderRadius: 6, fontSize: 13 }}
                  >
                    <option value="all">All</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Preview count */}
          <div style={{
            padding: 16, backgroundColor: 'var(--bg-1)', borderRadius: 12, border: '1px solid var(--divider)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>Records to export:</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#14B8A6' }}>{itemCount.toLocaleString()}</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--divider)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              height: 44, padding: '0 20px', backgroundColor: 'var(--cp-float)', border: '1px solid var(--divider)',
              borderRadius: 12, fontSize: 14, fontWeight: 500, color: 'var(--fg-2)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || itemCount === 0}
            style={{
              height: 44, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 8,
              background: itemCount === 0 ? 'var(--divider)' : 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
              border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, color: 'var(--ds-surface, #FFF)',
              cursor: isExporting || itemCount === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <Download size={16} />
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
