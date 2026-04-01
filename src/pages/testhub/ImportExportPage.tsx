import { useState, useEffect } from 'react';
import { 
  Upload, Download, FileUp, FileDown, RefreshCw,
  CheckCircle2, XCircle, Clock, AlertTriangle, FileText, Bug,
  FileCheck, Layers, Tags, Database, Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { TestHubPageHeader } from '@/components/testhub/TestHubPageHeader';
import { ImportModal } from '@/components/testhub/import-export/ImportModal';
import { ExportModal } from '@/components/testhub/import-export/ExportModal';

interface ImportJob {
  id: string;
  job_key: string;
  name: string;
  type: string;
  status: string;
  source_format: string;
  file_name: string | null;
  total_rows: number;
  success_count: number;
  error_count: number;
  created_at: string;
  completed_at: string | null;
}

interface ExportJob {
  id: string;
  job_key: string;
  name: string;
  type: string;
  status: string;
  export_format: string;
  file_name: string | null;
  total_items: number;
  download_url: string | null;
  created_at: string;
  completed_at: string | null;
}

interface Stats {
  total_imports: number;
  successful_imports: number;
  failed_imports: number;
  total_exports: number;
  successful_exports: number;
  records_imported: number;
  records_exported: number;
}

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  test_cases: { label: 'Test Cases', icon: FileText, color: '#2563EB' },
  defects: { label: 'Defects', icon: Bug, color: '#DC2626' },
  requirements: { label: 'Requirements', icon: FileCheck, color: '#059669' },
  shared_steps: { label: 'Shared Steps', icon: Layers, color: '#7C3AED' },
  tags: { label: 'Tags', icon: Tags, color: '#EC4899' },
  cycles: { label: 'Test Cycles', icon: RefreshCw, color: '#0891B2' },
  full_backup: { label: 'Full Backup', icon: Database, color: '#64748B' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: 'Pending', color: '#64748B', bg: '#F1F5F9', icon: Clock },
  validating: { label: 'Validating', color: '#D97706', bg: '#FFFBEB', icon: AlertTriangle },
  processing: { label: 'Processing', color: '#2563EB', bg: '#EFF6FF', icon: RefreshCw },
  completed: { label: 'Completed', color: '#059669', bg: '#ECFDF5', icon: CheckCircle2 },
  failed: { label: 'Failed', color: '#DC2626', bg: '#FEF2F2', icon: XCircle },
  cancelled: { label: 'Cancelled', color: '#94A3B8', bg: '#F8FAFC', icon: XCircle },
};

export default function ImportExportPage() {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [importsRes, exportsRes, statsRes] = await Promise.all([
        (supabase as any).from('th_import_jobs').select('*').order('created_at', { ascending: false }).limit(50),
        (supabase as any).from('th_export_jobs').select('*').order('created_at', { ascending: false }).limit(50),
        (supabase as any).rpc('get_import_export_stats'),
      ]);

      if (importsRes.data) setImportJobs(importsRes.data);
      if (exportsRes.data) setExportJobs(exportsRes.data);
      if (statsRes.data && statsRes.data.length > 0) setStats(statsRes.data[0]);
    } catch (err) {
      console.error('Fetch error:', err);
      catalystToast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const deleteImportJob = async (id: string) => {
    if (!confirm('Delete this import job?')) return;
    try {
      await (supabase as any).from('th_import_jobs').delete().eq('id', id);
      catalystToast.success('Import job deleted');
      fetchData();
    } catch (err) {
      catalystToast.error('Failed to delete');
    }
  };

  const deleteExportJob = async (id: string) => {
    if (!confirm('Delete this export job?')) return;
    try {
      await (supabase as any).from('th_export_jobs').delete().eq('id', id);
      catalystToast.success('Export job deleted');
      fetchData();
    } catch (err) {
      catalystToast.error('Failed to delete');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#F8FAFC' }}>
      <TestHubPageHeader title="Import / Export" subtitle="Import data from files or export your test data">
        <button onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 16px', border: '1px solid #E2E8F0', borderRadius: 8, backgroundColor: '#FFFFFF', color: '#334155', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </TestHubPageHeader>
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 20, border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <FileUp size={18} style={{ color: '#14B8A6' }} />
              <span style={{ fontSize: 12, color: '#64748B', textTransform: 'uppercase' }}>Total Imports</span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', margin: 0 }}>{stats.total_imports}</p>
            <p style={{ fontSize: 12, color: '#059669', margin: '4px 0 0' }}>
              {stats.records_imported.toLocaleString()} records
            </p>
          </div>
          <div style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 20, border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <FileDown size={18} style={{ color: '#14B8A6' }} />
              <span style={{ fontSize: 12, color: '#64748B', textTransform: 'uppercase' }}>Total Exports</span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', margin: 0 }}>{stats.total_exports}</p>
            <p style={{ fontSize: 12, color: '#059669', margin: '4px 0 0' }}>
              {stats.records_exported.toLocaleString()} records
            </p>
          </div>
          <div style={{ backgroundColor: '#ECFDF5', borderRadius: 12, padding: 20, border: '1px solid #A7F3D0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <CheckCircle2 size={18} style={{ color: '#059669' }} />
              <span style={{ fontSize: 12, color: '#059669', textTransform: 'uppercase' }}>Successful</span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#059669', margin: 0 }}>
              {stats.successful_imports + stats.successful_exports}
            </p>
          </div>
          <div style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 20, border: '1px solid #FECACA' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <XCircle size={18} style={{ color: '#DC2626' }} />
              <span style={{ fontSize: 12, color: '#DC2626', textTransform: 'uppercase' }}>Failed</span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#DC2626', margin: 0 }}>{stats.failed_imports}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, backgroundColor: '#E2E8F0', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        <button
          onClick={() => setActiveTab('import')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', border: 'none', borderRadius: 8,
            backgroundColor: activeTab === 'import' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'import' ? '#0F172A' : '#64748B',
            fontSize: 14, fontWeight: 500, cursor: 'pointer',
            boxShadow: activeTab === 'import' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          <Upload size={16} /> Import History
        </button>
        <button
          onClick={() => setActiveTab('export')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', border: 'none', borderRadius: 8,
            backgroundColor: activeTab === 'export' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'export' ? '#0F172A' : '#64748B',
            fontSize: 14, fontWeight: 500, cursor: 'pointer',
            boxShadow: activeTab === 'export' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          <Download size={16} /> Export History
        </button>
      </div>

      {/* Job Lists */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#14B8A6' }} />
        </div>
      ) : activeTab === 'import' ? (
        importJobs.length === 0 ? (
          <div style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 60, textAlign: 'center', border: '1px solid #E2E8F0' }}>
            <Upload size={48} style={{ color: '#CBD5E1', marginBottom: 16 }} />
            <p style={{ fontSize: 16, color: '#64748B', margin: 0 }}>No import jobs yet</p>
            <p style={{ fontSize: 14, color: '#94A3B8', margin: '8px 0 0' }}>
              Click "Import" to start importing data
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {importJobs.map((job) => {
              const type = TYPE_CONFIG[job.type] || TYPE_CONFIG.test_cases;
              const status = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
              const TypeIcon = type.icon;
              const StatusIcon = status.icon;

              return (
                <div key={job.id} style={{
                  backgroundColor: '#FFF', borderRadius: 12, padding: 20,
                  border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10,
                      backgroundColor: `${type.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <TypeIcon size={22} style={{ color: type.color }} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#14B8A6', backgroundColor: '#F0FDFA', padding: '2px 8px', borderRadius: 4 }}>
                          {job.job_key}
                        </span>
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500,
                          color: status.color, backgroundColor: status.bg, padding: '2px 8px', borderRadius: 4,
                        }}>
                          <StatusIcon size={12} /> {status.label}
                        </span>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: '#0F172A', margin: 0 }}>{job.name}</p>
                      <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>
                        {type.label} • {job.source_format.toUpperCase()} • {formatDate(job.created_at)}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {job.status === 'completed' && (
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#059669', margin: 0 }}>
                          {job.success_count} imported
                        </p>
                        {job.error_count > 0 && (
                          <p style={{ fontSize: 12, color: '#DC2626', margin: '2px 0 0' }}>
                            {job.error_count} errors
                          </p>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => deleteImportJob(job.id)}
                      style={{
                        width: 36, height: 36, border: '1px solid #FECACA', borderRadius: 8,
                        backgroundColor: '#FEF2F2', color: '#DC2626', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        exportJobs.length === 0 ? (
          <div style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 60, textAlign: 'center', border: '1px solid #E2E8F0' }}>
            <Download size={48} style={{ color: '#CBD5E1', marginBottom: 16 }} />
            <p style={{ fontSize: 16, color: '#64748B', margin: 0 }}>No export jobs yet</p>
            <p style={{ fontSize: 14, color: '#94A3B8', margin: '8px 0 0' }}>
              Click "Export" to export your data
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {exportJobs.map((job) => {
              const type = TYPE_CONFIG[job.type] || TYPE_CONFIG.test_cases;
              const status = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
              const TypeIcon = type.icon;
              const StatusIcon = status.icon;

              return (
                <div key={job.id} style={{
                  backgroundColor: '#FFF', borderRadius: 12, padding: 20,
                  border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10,
                      backgroundColor: `${type.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <TypeIcon size={22} style={{ color: type.color }} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#14B8A6', backgroundColor: '#F0FDFA', padding: '2px 8px', borderRadius: 4 }}>
                          {job.job_key}
                        </span>
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500,
                          color: status.color, backgroundColor: status.bg, padding: '2px 8px', borderRadius: 4,
                        }}>
                          <StatusIcon size={12} /> {status.label}
                        </span>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: '#0F172A', margin: 0 }}>{job.name}</p>
                      <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>
                        {type.label} • {job.export_format.toUpperCase()} • {job.total_items} items • {formatDate(job.created_at)}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {job.status === 'completed' && job.download_url && (
                      <a
                        href={job.download_url}
                        download
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          height: 36, padding: '0 14px', border: '1px solid #A7F3D0', borderRadius: 8,
                          backgroundColor: '#ECFDF5', color: '#059669', fontSize: 13, textDecoration: 'none',
                        }}
                      >
                        <Download size={14} /> Download
                      </a>
                    )}
                    <button
                      onClick={() => deleteExportJob(job.id)}
                      style={{
                        width: 36, height: 36, border: '1px solid #FECACA', borderRadius: 8,
                        backgroundColor: '#FEF2F2', color: '#DC2626', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={fetchData}
      />
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExported={fetchData}
      />
      </div>
    </div>
  );
}
