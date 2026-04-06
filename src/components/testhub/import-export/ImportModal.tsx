import { useState, useRef } from 'react';
import { 
  X, Upload, FileText, Bug, FileCheck, Layers, Tags,
  CheckCircle2, File, Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import Papa from 'papaparse';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

const IMPORT_TYPES = [
  { value: 'test_cases', label: 'Test Cases', icon: FileText, color: 'var(--cp-blue)' },
  { value: 'defects', label: 'Defects', icon: Bug, color: 'var(--sem-danger)' },
  { value: 'requirements', label: 'Requirements', icon: FileCheck, color: 'var(--sem-success)' },
  { value: 'shared_steps', label: 'Shared Steps', icon: Layers, color: '#2563EB' },
  { value: 'tags', label: 'Tags', icon: Tags, color: '#EC4899' },
];

export function ImportModal({ isOpen, onClose, onImported }: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [importType, setImportType] = useState('test_cases');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [importName, setImportName] = useState('');

  const REQUIRED_FIELDS: Record<string, string[]> = {
    test_cases: ['title'],
    defects: ['title'],
    requirements: ['title'],
    shared_steps: ['title'],
    tags: ['name'],
  };

  const OPTIONAL_FIELDS: Record<string, string[]> = {
    test_cases: ['description', 'priority', 'status', 'preconditions', 'expected_result'],
    defects: ['description', 'severity', 'priority', 'status', 'steps_to_reproduce'],
    requirements: ['description', 'type', 'priority', 'external_id', 'source'],
    shared_steps: ['description'],
    tags: ['color', 'category', 'description'],
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = ['text/csv', 'application/json', 'application/vnd.ms-excel'];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.json')) {
      catalystToast.error('Please select a CSV or JSON file');
      return;
    }

    setFile(selectedFile);
    setImportName(selectedFile.name.replace(/\.[^/.]+$/, ''));
    parseFile(selectedFile);
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      
      if (file.name.endsWith('.json')) {
        try {
          const jsonData = JSON.parse(content);
          const data = Array.isArray(jsonData) ? jsonData : [jsonData];
          setParsedData(data);
          if (data.length > 0) {
            setHeaders(Object.keys(data[0]));
            autoMapFields(Object.keys(data[0]));
          }
        } catch {
          catalystToast.error('Invalid JSON file');
        }
      } else {
        Papa.parse(content, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setParsedData(results.data);
            if (results.meta.fields) {
              setHeaders(results.meta.fields);
              autoMapFields(results.meta.fields);
            }
          },
          error: () => {
            catalystToast.error('Failed to parse CSV');
          }
        });
      }
    };
    
    reader.readAsText(file);
  };

  const autoMapFields = (fileHeaders: string[]) => {
    const mapping: Record<string, string> = {};
    const allFields = [...REQUIRED_FIELDS[importType], ...OPTIONAL_FIELDS[importType]];
    
    fileHeaders.forEach(header => {
      const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      const match = allFields.find(field => {
        const lowerField = field.toLowerCase().replace(/[^a-z0-9]/g, '');
        return lowerHeader.includes(lowerField) || lowerField.includes(lowerHeader);
      });
      if (match) {
        mapping[header] = match;
      }
    });
    
    setFieldMapping(mapping);
  };

  const handleImport = async () => {
    if (!file || parsedData.length === 0) return;
    
    const mappedFields = Object.values(fieldMapping);
    const missingRequired = REQUIRED_FIELDS[importType].filter(f => !mappedFields.includes(f));
    if (missingRequired.length > 0) {
      catalystToast.error(`Missing required field mapping: ${missingRequired.join(', ')}`);
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: job, error: jobError } = await (supabase as any)
        .from('th_import_jobs')
        .insert({
          name: importName || `Import ${new Date().toLocaleDateString()}`,
          type: importType,
          source_format: file.name.endsWith('.json') ? 'json' : 'csv',
          file_name: file.name,
          file_size: file.size,
          total_rows: parsedData.length,
          status: 'processing',
          started_at: new Date().toISOString(),
          created_by: user?.id,
        })
        .select()
        .single();

      if (jobError) throw jobError;

      const transformedData = parsedData.map(row => {
        const newRow: Record<string, any> = {};
        Object.entries(fieldMapping).forEach(([sourceField, targetField]) => {
          if (row[sourceField] !== undefined) {
            newRow[targetField] = row[sourceField];
          }
        });
        return newRow;
      });

      let successCount = 0;
      let errorCount = 0;
      const errors: any[] = [];

      if (importType === 'test_cases') {
        for (let i = 0; i < transformedData.length; i++) {
          const row = transformedData[i];
          try {
            const priorityMap: Record<string, string> = {
              'high': '00000000-0000-0000-0001-000000000002',
              'medium': '00000000-0000-0000-0001-000000000003',
              'low': '00000000-0000-0000-0001-000000000004',
            };
            const typeMap: Record<string, string> = {
              'functional': '00000000-0000-0000-0002-000000000001',
              'regression': '00000000-0000-0000-0002-000000000002',
              'smoke': '00000000-0000-0000-0002-000000000003',
            };
            const priorityVal = (row.priority || 'medium').toLowerCase();
            const typeVal = (row.type || 'functional').toLowerCase();
            const { error } = await (supabase as any).from('tm_test_cases').insert({
              title: row.title,
              description: row.description || null,
              priority_id: priorityMap[priorityVal] || priorityMap['medium'],
              case_type_id: typeMap[typeVal] || typeMap['functional'],
              status: row.status || 'draft',
              preconditions: row.preconditions || null,
              expected_result: row.expected_result || null,
            });
            if (error) throw error;
            successCount++;
          } catch (err: any) {
            errorCount++;
            errors.push({ row: i + 1, error: err.message });
          }
        }
      } else if (importType === 'defects') {
        for (let i = 0; i < transformedData.length; i++) {
          const row = transformedData[i];
          try {
            const { error } = await (supabase as any).from('tm_defects').insert({
              title: row.title,
              description: row.description || null,
              severity: row.severity || 'medium',
              priority: row.priority || 'medium',
              status: row.status || 'open',
              steps_to_reproduce: row.steps_to_reproduce || null,
              reporter_id: user?.id,
            });
            if (error) throw error;
            successCount++;
          } catch (err: any) {
            errorCount++;
            errors.push({ row: i + 1, error: err.message });
          }
        }
      } else if (importType === 'tags') {
        for (let i = 0; i < transformedData.length; i++) {
          const row = transformedData[i];
          try {
            const { error } = await (supabase as any).from('th_tags').insert({
              name: row.name,
              color: row.color || '#6366F1',
              category: row.category || null,
              description: row.description || null,
              created_by: user?.id,
            });
            if (error) throw error;
            successCount++;
          } catch (err: any) {
            errorCount++;
            errors.push({ row: i + 1, error: err.message });
          }
        }
      } else if (importType === 'requirements') {
        for (let i = 0; i < transformedData.length; i++) {
          const row = transformedData[i];
          try {
            const { error } = await (supabase as any).from('tm_requirements').insert({
              title: row.title,
              description: row.description || null,
              type: row.type || 'functional',
              priority: row.priority || 'medium',
              external_id: row.external_id || null,
              source: row.source || null,
            });
            if (error) throw error;
            successCount++;
          } catch (err: any) {
            errorCount++;
            errors.push({ row: i + 1, error: err.message });
          }
        }
      } else if (importType === 'shared_steps') {
        for (let i = 0; i < transformedData.length; i++) {
          const row = transformedData[i];
          try {
            const { error } = await (supabase as any).from('th_shared_steps').insert({
              title: row.title,
              description: row.description || null,
              created_by: user?.id,
            });
            if (error) throw error;
            successCount++;
          } catch (err: any) {
            errorCount++;
            errors.push({ row: i + 1, error: err.message });
          }
        }
      }

      await (supabase as any)
        .from('th_import_jobs')
        .update({
          status: errorCount === transformedData.length ? 'failed' : 'completed',
          processed_rows: transformedData.length,
          success_count: successCount,
          error_count: errorCount,
          errors: errors,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      catalystToast.success(`Imported ${successCount} records`);
      
      onImported();
      onClose();
      resetModal();
    } catch (err) {
      console.error('Import error:', err);
      catalystToast.error('Import failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setFile(null);
    setParsedData([]);
    setHeaders([]);
    setFieldMapping({});
    setImportName('');
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 600, maxHeight: '90vh', backgroundColor: 'var(--cp-float)',
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
              <Upload size={22} style={{ color: '#FFFFFF' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: 0 }}>Import Data</h2>
              <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: 0 }}>Step {step} of 3</p>
            </div>
          </div>
          <button onClick={() => { onClose(); resetModal(); }} style={{
            width: 36, height: 36, border: 'none', borderRadius: 8,
            backgroundColor: 'transparent', color: 'var(--fg-3)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {step === 1 && (
            <>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 16 }}>What do you want to import?</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {IMPORT_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = importType === type.value;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setImportType(type.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: 16,
                        border: `2px solid ${isSelected ? type.color : 'var(--divider)'}`,
                        borderRadius: 12, backgroundColor: isSelected ? `${type.color}10` : 'var(--cp-float)',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <Icon size={24} style={{ color: type.color }} />
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-1)' }}>{type.label}</span>
                      {isSelected && <CheckCircle2 size={18} style={{ color: type.color, marginLeft: 'auto' }} />}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 16 }}>Upload your file</h3>
              <input ref={fileInputRef} type="file" accept=".csv,.json" onChange={handleFileSelect} style={{ display: 'none' }} />
              {!file ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: 40, border: '2px dashed var(--divider)', borderRadius: 12,
                    textAlign: 'center', cursor: 'pointer', backgroundColor: 'var(--bg-1)',
                  }}
                >
                  <Upload size={40} style={{ color: 'var(--fg-4)', marginBottom: 12 }} />
                  <p style={{ fontSize: 14, color: 'var(--fg-2)', margin: 0 }}>Click to upload or drag and drop</p>
                  <p style={{ fontSize: 12, color: 'var(--fg-4)', margin: '4px 0 0' }}>CSV or JSON files supported</p>
                </div>
              ) : (
                <div style={{ padding: 20, backgroundColor: 'var(--bg-1)', borderRadius: 12, border: '1px solid var(--divider)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <File size={24} style={{ color: '#14B8A6' }} />
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-1)', margin: 0 }}>{file.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '2px 0 0' }}>
                          {(file.size / 1024).toFixed(1)} KB • {parsedData.length} rows detected
                        </p>
                      </div>
                    </div>
                    <button onClick={() => { setFile(null); setParsedData([]); setHeaders([]); }} style={{
                      width: 32, height: 32, border: 'none', borderRadius: 6,
                      backgroundColor: '#FEE2E2', color: 'var(--sem-danger)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6 }}>Import Name</label>
                <input
                  type="text"
                  value={importName}
                  onChange={(e) => setImportName(e.target.value)}
                  placeholder="My Import"
                  style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid var(--divider)', borderRadius: 8, fontSize: 14 }}
                />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 12 }}>Map your fields</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {headers.map((header) => (
                  <div key={header} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--fg-2)', backgroundColor: 'var(--cp-bd-zone)', padding: '8px 12px', borderRadius: 6 }}>
                      {header}
                    </span>
                    <span style={{ color: 'var(--fg-4)' }}>→</span>
                    <select
                      value={fieldMapping[header] || ''}
                      onChange={(e) => setFieldMapping({ ...fieldMapping, [header]: e.target.value })}
                      style={{ flex: 1, height: 36, padding: '0 10px', border: '1px solid var(--divider)', borderRadius: 6, fontSize: 13 }}
                    >
                      <option value="">(Skip)</option>
                      {[...REQUIRED_FIELDS[importType], ...OPTIONAL_FIELDS[importType]].map((field) => (
                        <option key={field} value={field}>{field} {REQUIRED_FIELDS[importType].includes(field) ? '*' : ''}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--fg-4)', marginTop: 12 }}>* Required fields</p>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between' }}>
          <button
            onClick={() => step > 1 ? setStep(step - 1) : (onClose(), resetModal())}
            style={{
              height: 44, padding: '0 20px', backgroundColor: 'var(--cp-float)', border: '1px solid var(--divider)',
              borderRadius: 12, fontSize: 14, fontWeight: 500, color: 'var(--fg-2)', cursor: 'pointer',
            }}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={() => {
              if (step === 1) setStep(2);
              else if (step === 2 && file && parsedData.length > 0) setStep(3);
              else if (step === 3) handleImport();
            }}
            disabled={(step === 2 && !file) || isProcessing}
            style={{
              height: 44, padding: '0 24px',
              background: (step === 2 && !file) ? 'var(--divider)' : 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
              border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#FFF',
              cursor: (step === 2 && !file) || isProcessing ? 'not-allowed' : 'pointer',
            }}
          >
            {isProcessing ? 'Importing...' : step === 3 ? `Import ${parsedData.length} Records` : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
