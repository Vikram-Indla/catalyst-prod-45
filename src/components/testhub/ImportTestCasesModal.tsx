import { useState, useRef } from 'react';
import { X, Upload, FileText, Download, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImportTestCasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  folders: Array<{ id: string; name: string }>;
}

interface ParsedTestCase {
  title: string;
  description?: string;
  preconditions?: string;
  priority: string;
  type: string;
  automation: string;
  steps?: Array<{ action: string; expected: string }>;
}

export function ImportTestCasesModal({ isOpen, onClose, onSuccess, folders }: ImportTestCasesModalProps) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedTestCase[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('upload');
    setFile(null);
    setParsedData([]);
    setSelectedFolderId('');
    setError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = async (selectedFile: File) => {
    setError(null);
    
    if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx')) {
      setError('Please upload a CSV or Excel file');
      return;
    }

    setFile(selectedFile);
    
    try {
      const text = await selectedFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
      
      const parsed: ParsedTestCase[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx]?.replace(/"/g, '').trim() || '';
        });
        
        const steps: Array<{ action: string; expected: string }> = [];
        for (let s = 1; s <= 10; s++) {
          const action = row[`step_${s}_action`];
          const expected = row[`step_${s}_expected`];
          if (action) steps.push({ action, expected: expected || '' });
        }
        
        if (row.title) {
          parsed.push({
            title: row.title,
            description: row.description || row.objective,
            preconditions: row.preconditions,
            priority: row.priority || 'medium',
            type: row.type || 'functional',
            automation: row.automation || 'manual',
            steps,
          });
        }
      }
      
      if (parsed.length === 0) {
        setError('No valid test cases found in file');
        return;
      }
      
      setParsedData(parsed);
      setStep('preview');
    } catch (err) {
      setError('Failed to parse file');
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setError(null);
    
    try {
      for (const tc of parsedData) {
        const { data: lastCase } = await supabase
          .from('tm_test_cases')
          .select('case_key')
          .order('created_at', { ascending: false })
          .limit(1);
        
        let nextNum = 1;
        if (lastCase?.[0]?.case_key) {
          const match = lastCase[0].case_key.match(/TC-(\d+)/);
          if (match) nextNum = parseInt(match[1]) + 1;
        }
        
        const { data: newCase, error: tcError } = await (supabase as any)
          .from('tm_test_cases')
          .insert([{
            case_key: `TC-${String(nextNum).padStart(3, '0')}`,
            title: tc.title,
            description: tc.description,
            preconditions: tc.preconditions,
            folder_id: selectedFolderId || null,
            status: 'draft',
            automation_status: tc.automation || 'manual',
          }])
          .select()
          .single();
        
        if (tcError) throw tcError;
        
        if (tc.steps?.length && newCase) {
          await supabase.from('tm_test_steps').insert(
            tc.steps.map((s, i) => ({
              test_case_id: newCase.id,
              step_number: i + 1,
              action: s.action,
              expected_result: s.expected,
            }))
          );
        }
      }
      
      toast.success(`Imported ${parsedData.length} test cases`);
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setError(message);
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = `title,description,preconditions,priority,type,automation,step_1_action,step_1_expected
"Login with valid credentials","Verify user can login","User account exists",critical,functional,manual,"Navigate to login page","Login page displays"
"Login with invalid password","Verify error on wrong password","User account exists",high,functional,manual,"Enter wrong password","Error message shown"`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'test-cases-template.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000,
    }} onClick={handleClose}>
      <div style={{
        width: 600, backgroundColor: 'var(--cp-float)', borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--divider)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: 0 }}>
              Import Test Cases
            </h2>
            <p style={{ fontSize: 14, color: 'var(--fg-3)', marginTop: 4 }}>
              {step === 'upload' ? 'Upload CSV or Excel file' : 'Review and import'}
            </p>
          </div>
          <button onClick={handleClose} style={{
            width: 32, height: 32, border: 'none', borderRadius: 8,
            backgroundColor: 'transparent', color: 'var(--fg-4)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          {error && (
            <div style={{
              padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid color-mix(in srgb, var(--sem-danger) 20%, transparent)',
              borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center',
              gap: 8, color: 'var(--sem-danger)', fontSize: 13,
            }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {step === 'upload' ? (
            <>
              <div
                onDrop={(e) => { e.preventDefault(); e.dataTransfer.files[0] && handleFileSelect(e.dataTransfer.files[0]); }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--divider)', borderRadius: 12, padding: 48,
                  textAlign: 'center', backgroundColor: 'var(--bg-1)', cursor: 'pointer',
                }}
              >
                <Upload size={32} style={{ color: 'var(--fg-4)', marginBottom: 12 }} />
                <p style={{ fontSize: 14, color: 'var(--fg-2)', marginBottom: 4 }}>
                  Drag and drop your file here
                </p>
                <p style={{ fontSize: 13, color: 'var(--fg-3)' }}>or click to browse</p>
                <p style={{ fontSize: 12, color: 'var(--fg-4)', marginTop: 8 }}>Supported: .csv, .xlsx</p>
              </div>
              
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                style={{ display: 'none' }} />

              <button onClick={downloadTemplate} style={{
                marginTop: 16, background: 'none', border: 'none', color: 'var(--cp-blue)',
                fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: 6,
              }}>
                <Download size={14} /> Download Template
              </button>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <FileText size={20} style={{ color: 'var(--fg-3)' }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>{file?.name}</p>
                    <p style={{ fontSize: 13, color: 'var(--sem-success)' }}>Found {parsedData.length} test cases</p>
                  </div>
                </div>
                <button onClick={resetState} style={{
                  background: 'none', border: 'none', color: 'var(--cp-blue)', fontSize: 13, cursor: 'pointer',
                }}>Change File</button>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Import to folder:
                </label>
                <select value={selectedFolderId} onChange={(e) => setSelectedFolderId(e.target.value)}
                  style={{ width: '100%', height: 40, padding: '8px 12px', border: '1.5px solid var(--divider)', borderRadius: 8, fontSize: 14 }}>
                  <option value="">No folder (root)</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>

              <div style={{ border: '1px solid var(--divider)', borderRadius: 8, overflow: 'hidden', maxHeight: 180, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-1)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--divider)' }}>Title</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--divider)' }}>Priority</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--divider)' }}>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 5).map((tc, i) => (
                      <tr key={i}>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--divider)' }}>{tc.title}</td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--divider)' }}>{tc.priority}</td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--divider)' }}>{tc.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--divider)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={handleClose} style={{
            height: 40, padding: '0 20px', backgroundColor: 'var(--cp-float)', border: '1.5px solid var(--divider)',
            borderRadius: 8, fontSize: 14, fontWeight: 500, color: 'var(--fg-2)', cursor: 'pointer',
          }}>Cancel</button>
          {step === 'preview' && (
            <button onClick={handleImport} disabled={isImporting} style={{
              height: 40, padding: '0 20px', background: 'linear-gradient(135deg, var(--cp-blue) 0%, var(--cp-primary-70) 100%)',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#FFFFFF',
              cursor: isImporting ? 'wait' : 'pointer', opacity: isImporting ? 0.7 : 1,
            }}>
              {isImporting ? 'Importing...' : `Import ${parsedData.length} Test Cases`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ImportTestCasesModal;
