import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import Toggle from '@atlaskit/toggle';
import Spinner from '@atlaskit/spinner';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { flag } from '@/components/shared/JiraTable/flags';
import { supabase } from '@/integrations/supabase/client';

interface FiscalQuarter {
  id: string;
  label: string;
  year: number;
  quarter_num: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  sort_order: number;
}

const labelStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 'var(--ds-font-size-200)',
  color: 'var(--ds-text)',
};

const cellStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid var(--ds-border)',
  verticalAlign: 'middle',
};

function useQuarters() {
  return useQuery<FiscalQuarter[]>({
    queryKey: ['admin-fiscal-quarters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fiscal_quarters')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useUpdateQuarter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<FiscalQuarter> }) => {
      const { error } = await supabase.from('fiscal_quarters').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-fiscal-quarters'] }),
    onError: (e: any) => flag.error('Update failed', e?.message),
  });
}

function useAddQuarter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (q: { label: string; year: number; quarter_num: number; start_date: string; end_date: string; sort_order: number }) => {
      const { error } = await supabase.from('fiscal_quarters').insert(q);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-fiscal-quarters'] });
      qc.invalidateQueries({ queryKey: ['fiscal-quarters-active'] });
      flag.success('Quarter added');
    },
    onError: (e: any) => flag.error('Add failed', e?.message),
  });
}

function AddQuarterRow({ onDone }: { onDone: () => void }) {
  const [year, setYear] = useState(new Date().getFullYear() + 1);
  const [qNum, setQNum] = useState(1);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const addMutation = useAddQuarter();

  const label = `Q${qNum} ${year}`;

  const handleAdd = async () => {
    if (!start || !end) { flag.warning('Dates required', 'Set start and end dates'); return; }
    await addMutation.mutateAsync({ label, year, quarter_num: qNum, start_date: start, end_date: end, sort_order: year * 100 + qNum });
    onDone();
  };

  return (
    <tr style={{ background: 'var(--ds-background-selected)' }}>
      <td style={cellStyle}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={qNum} onChange={e => setQNum(Number(e.target.value))} style={{ border: '1px solid var(--ds-border)', borderRadius: 3, padding: '3px 6px', background: 'var(--ds-surface)', color: 'var(--ds-text)' }}>
            {[1, 2, 3, 4].map(n => <option key={n} value={n}>Q{n}</option>)}
          </select>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 70, border: '1px solid var(--ds-border)', borderRadius: 3, padding: '3px 6px', background: 'var(--ds-surface)', color: 'var(--ds-text)' }} />
          <span style={{ color: 'var(--ds-text-subtle)', fontSize: 13 }}>→ {label}</span>
        </div>
      </td>
      <td style={cellStyle}>
        <CatalystDatePicker value={start} onChange={v => setStart(v ?? '')} />
      </td>
      <td style={cellStyle}>
        <CatalystDatePicker value={end} onChange={v => setEnd(v ?? '')} />
      </td>
      <td style={cellStyle}>—</td>
      <td style={cellStyle}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button appearance="primary" onClick={handleAdd} isLoading={addMutation.isPending}>Add</Button>
          <Button appearance="subtle" onClick={onDone}>Cancel</Button>
        </div>
      </td>
    </tr>
  );
}

export default function QuartersAdminPage() {
  const { data: quarters = [], isLoading } = useQuarters();
  const updateMutation = useUpdateQuarter();
  const [adding, setAdding] = useState(false);

  const handleToggle = useCallback((q: FiscalQuarter) => {
    updateMutation.mutate({ id: q.id, patch: { is_active: !q.is_active } });
  }, [updateMutation]);

  const handleDateChange = useCallback((id: string, field: 'start_date' | 'end_date', val: string | null) => {
    if (!val) return;
    updateMutation.mutate({ id, patch: { [field]: val } });
  }, [updateMutation]);

  return (
    <AdminGuard>
      <div style={{ padding: '24px 32px', maxWidth: 860 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--ds-text)', fontSize: 20, fontWeight: 600 }}>Fiscal Quarters</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--ds-text-subtle)', fontSize: 13 }}>
              Manage quarters available in Business Requests and Milestones. Inactive quarters are hidden from create forms.
            </p>
          </div>
          <Button appearance="primary" onClick={() => setAdding(true)} isDisabled={adding}>Add quarter</Button>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
        ) : (
          <div style={{ border: '1px solid var(--ds-border)', borderRadius: 6, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--ds-surface-sunken)' }}>
                  <th style={{ ...cellStyle, ...labelStyle, textAlign: 'left' }}>Quarter</th>
                  <th style={{ ...cellStyle, ...labelStyle, textAlign: 'left' }}>Start date</th>
                  <th style={{ ...cellStyle, ...labelStyle, textAlign: 'left' }}>End date</th>
                  <th style={{ ...cellStyle, ...labelStyle, textAlign: 'left' }}>Active</th>
                  <th style={{ ...cellStyle, ...labelStyle, textAlign: 'left', width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {adding && <AddQuarterRow onDone={() => setAdding(false)} />}
                {quarters.map(q => (
                  <tr key={q.id} style={{ opacity: q.is_active ? 1 : 0.55 }}>
                    <td style={cellStyle}>
                      <span style={{ fontWeight: 600, color: 'var(--ds-text)', fontSize: 14 }}>{q.label}</span>
                    </td>
                    <td style={cellStyle}>
                      <CatalystDatePicker
                        value={q.start_date}
                        onChange={v => handleDateChange(q.id, 'start_date', v)}
                      />
                    </td>
                    <td style={cellStyle}>
                      <CatalystDatePicker
                        value={q.end_date}
                        onChange={v => handleDateChange(q.id, 'end_date', v)}
                      />
                    </td>
                    <td style={cellStyle}>
                      <Toggle
                        isChecked={q.is_active}
                        onChange={() => handleToggle(q)}
                        label={q.is_active ? 'Active' : 'Inactive'}
                      />
                    </td>
                    <td style={cellStyle}>
                      <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest)' }}>
                        {q.is_active ? 'Visible' : 'Hidden'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
