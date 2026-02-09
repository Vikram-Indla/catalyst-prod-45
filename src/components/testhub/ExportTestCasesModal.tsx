import { useState } from 'react';
import { X, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExportTestCasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  testCaseCount: number;
  selectedFolderId?: string | null;
}

export function ExportTestCasesModal({ isOpen, onClose, testCaseCount, selectedFolderId }: ExportTestCasesModalProps) {
  const [format, setFormat] = useState<'csv' | 'excel'>('csv');
  const [includeSteps, setIncludeSteps] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Fetch test cases
      let query = supabase.from('th_test_cases').select('*');
      if (selectedFolderId) {
        query = query.eq('folder_id', selectedFolderId);
      }
      
      const { data: testCases, error: tcError } = await query;
      if (tcError) throw tcError;
      
      // Fetch steps if needed
      let stepsMap: Record<string, Array<{ step_number: number; action: string; expected_result: string }>> = {};
      if (includeSteps && testCases?.length) {
        const { data: steps } = await supabase
          .from('th_test_steps')
          .select('*')
          .in('test_case_id', testCases.map(tc => tc.id))
          .order('step_number');
        
        steps?.forEach(s => {
          if (!stepsMap[s.test_case_id]) stepsMap[s.test_case_id] = [];
          stepsMap[s.test_case_id].push(s);
        });
      }
      
      // Build CSV rows
      const headers = [
        'case_key', 'title', 'objective', 'preconditions', 'priority', 'type', 'status', 'automation',
      ];
      
      if (includeSteps) {
        for (let i = 1; i <= 10; i++) {
          headers.push(`step_${i}_action`, `step_${i}_expected`);
        }
      }
      
      const rows = testCases?.map(tc => {
        const row: string[] = [
          tc.case_key,
          tc.title,
          tc.objective || '',
          tc.preconditions || '',
          tc.priority,
          tc.type,
          tc.status,
          tc.automation,
        ];
        
        if (includeSteps) {
          const steps = stepsMap[tc.id] || [];
          for (let i = 0; i < 10; i++) {
            row.push(steps[i]?.action || '', steps[i]?.expected_result || '');
          }
        }
        
        return row;
      }) || [];
      
      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')),
      ].join('\n');
      
      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-cases-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${testCases?.length || 0} test cases`);
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        width: 440, backgroundColor: '#FFFFFF', borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #E2E8F0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Export Test Cases
            </h2>
            <p style={{ fontSize: 14, color: '#64748B', marginTop: 4 }}>
              {testCaseCount} test cases will be exported
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, border: 'none', borderRadius: 8,
            backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          {/* Format Selection */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#0F172A' }}>
              Export Format
            </label>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={format === 'csv'}
                  onChange={() => setFormat('csv')}
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontSize: 14, color: '#334155' }}>CSV (.csv)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={format === 'excel'}
                  onChange={() => setFormat('excel')}
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontSize: 14, color: '#334155' }}>Excel (.xlsx)</span>
              </label>
            </div>
          </div>

          {/* Include Options */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#0F172A' }}>
              Include
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeSteps}
                onChange={(e) => setIncludeSteps(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontSize: 14, color: '#334155' }}>Test steps</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} style={{
            height: 40, padding: '0 20px', backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0',
            borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#334155', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleExport} disabled={isExporting} style={{
            height: 40, padding: '0 20px', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#FFFFFF',
            cursor: isExporting ? 'wait' : 'pointer', opacity: isExporting ? 0.7 : 1,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Download size={16} />
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportTestCasesModal;
