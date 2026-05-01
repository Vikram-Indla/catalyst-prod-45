import React, { useState, useMemo } from 'react';
import { CalendarOff, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFreezeWindows, useCreateFreezeWindow, useDeleteFreezeWindow } from '@/hooks/useReleaseHub';
import { RH } from '@/constants/releasehub.design';
import { useTheme } from '@/hooks/useTheme';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Tooltip } from '@/components/ads';

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysBetween(s: string, e: string) {
  const start = new Date(s + 'T00:00:00');
  const end = new Date(e + 'T00:00:00');
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

export default function FreezeWindowsPage() {
  const { isDark } = useTheme();
  const { data: windows = [], isLoading } = useFreezeWindows();
  const createMut = useCreateFreezeWindow();
  const deleteMut = useDeleteFreezeWindow();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', reason: '' });
  const [formError, setFormError] = useState('');

  // Calendar state
  const [calMonth, setCalMonth] = useState(() => new Date());
  const today = new Date();

  const calendarDays = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const days: { date: Date; inMonth: boolean }[] = [];

    for (let i = startPad - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month, -i), inMonth: false });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: new Date(year, month, d), inMonth: true });
    }
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        days.push({ date: new Date(year, month + 1, i), inMonth: false });
      }
    }
    return days;
  }, [calMonth]);

  const isFreezeDate = (date: Date) => {
    const riyadh = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
    const d = riyadh.getFullYear() + '-' + String(riyadh.getMonth() + 1).padStart(2, '0') + '-' + String(riyadh.getDate()).padStart(2, '0');
    return windows.find((fw: any) => d >= fw.start_date && d <= fw.end_date);
  };

  const isToday = (date: Date) => {
    const riyadh = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
    return date.getFullYear() === riyadh.getFullYear() &&
      date.getMonth() === riyadh.getMonth() &&
      date.getDate() === riyadh.getDate();
  };

  const handleCreate = async () => {
    setFormError('');
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    if (!form.start_date) { setFormError('Start date is required'); return; }
    if (!form.end_date) { setFormError('End date is required'); return; }
    if (form.end_date < form.start_date) { setFormError('End date must be on or after start date'); return; }

    try {
      await createMut.mutateAsync({
        name: form.name.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason.trim() || undefined,
      });
      toast.success('Freeze window added.');
      setShowModal(false);
      setForm({ name: '', start_date: '', end_date: '', reason: '' });
    } catch (err) {
      toast.error('Failed to create freeze window: ' + String(err));
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete freeze window "${name}"?`)) return;
    try {
      await deleteMut.mutateAsync(id);
      toast.success('Freeze window removed.');
    } catch (err) {
      toast.error('Failed to delete: ' + String(err));
    }
  };

  const monthLabel = calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div style={{ background: 'var(--cp-bg-elevated, #FFFFFF)', minHeight: '100%', padding: '24px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px]" style={{ fontFamily: RH.fontDisplay, color: 'var(--cp-text-primary, #0F172A)', fontWeight: 650 }}>Freeze Windows</h1>
          <p className="text-[13px]" style={{ fontFamily: RH.fontBody, color: 'var(--cp-text-tertiary, #64748B)' }}>
            Define deployment freeze periods. Releases targeting these dates will be flagged automatically.
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="h-9 px-4 rounded-md bg-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))] hover:bg-[var(--ds-background-brand-bold-hovered,var(--ds-background-brand-bold-hovered, #1D4ED8))] text-white text-[13px] font-semibold flex items-center gap-1.5 active:scale-[0.98] transition-colors">
          <Plus size={14} /> Add Freeze Window
        </button>
      </div>

      {/* Calendar Strip */}
      <div className="mb-6 rounded-lg p-4" style={{ background: 'var(--cp-bg-elevated, #FFFFFF)', border: `1px solid ${'var(--cp-border, #E2E8F0)'}` }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1))}
            className="h-7 w-7 rounded flex items-center justify-center" style={{ color: 'var(--cp-text-tertiary, #64748B)' }}>
            <ChevronLeft size={16} />
          </button>
          <span className="text-[14px] font-semibold" style={{ fontFamily: RH.fontDisplay, color: 'var(--cp-text-primary, #0F172A)' }}>{monthLabel}</span>
          <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1))}
            className="h-7 w-7 rounded flex items-center justify-center" style={{ color: 'var(--cp-text-tertiary, #64748B)' }}>
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-[0.06em] pb-1" style={{ color: 'var(--cp-text-muted, #94A3B8)' }}>{d}</div>
          ))}
          {calendarDays.map((cd, i) => {
            const fw = isFreezeDate(cd.date);
            const todayRing = isToday(cd.date);
            return (
              <Tooltip key={i} position="top" content={fw ? (fw as any).name : null}>
                <div className={`h-9 w-full flex items-center justify-center text-[12px] rounded cursor-default
                  ${todayRing ? 'ring-2 ring-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))]' : ''}
                `} style={{
                  color: !cd.inMonth ? ('var(--cp-bg-sunken, #CBD5E1)') : ('var(--cp-text-secondary, #334155)'),
                  ...(fw ? { background: 'var(--cp-warning-light, #FEF3C7)', border: `1px solid ${isDark ? 'rgba(217,119,6,0.3)' : '#FCD34D'}` } : {}),
                }}>
                  {cd.date.getDate()}
                </div>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-9 rounded animate-pulse" style={{ background: 'var(--cp-bg-sunken, #F1F5F9)' }} />
          ))}
        </div>
      ) : windows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--cp-bg-sunken, #F1F5F9)' }}>
            <CalendarOff className="w-8 h-8" style={{ color: 'var(--cp-text-muted, #94A3B8)' }} />
          </div>
          <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--cp-text-primary, #0F172A)' }}>No freeze windows defined</h3>
          <p className="text-[13px] max-w-md" style={{ color: 'var(--cp-text-tertiary, #64748B)' }}>Add one to protect critical periods.</p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ background: 'var(--cp-bg-elevated, #FFFFFF)', border: `1px solid ${'var(--cp-border, #E2E8F0)'}` }}>
          <table className="w-full text-[13px]" style={{ fontFamily: RH.fontBody }}>
            <thead>
              <tr style={{ background: 'var(--cp-bg-sunken, #F1F5F9)' }}>
                {['NAME', 'START DATE', 'END DATE', 'DURATION', 'REASON', 'ACTIONS'].map(h => (
                  <th key={h} className="px-3 py-0 h-9 text-left text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--cp-text-tertiary, #64748B)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {windows.map((fw: any) => (
                <tr key={fw.id} className="group"
                  style={{ height: 50, transition: 'background 120ms', borderBottom: `0.75px solid ${'var(--cp-border-subtle, rgba(15,23,42,0.06))'}` }}
                  onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'var(--cp-bg-surface, #242528)' : 'rgba(15,23,42,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--cp-bg-elevated, #FFFFFF)')}>
                  <td className="px-3 py-0 font-medium" style={{ color: 'var(--cp-text-primary, #0F172A)', fontWeight: 650 }}>{fw.name}</td>
                  <td className="px-3 py-0" style={{ fontFamily: RH.fontMono, fontSize: 12, color: 'var(--cp-text-secondary, #475569)' }}>{formatDate(fw.start_date)}</td>
                  <td className="px-3 py-0" style={{ fontFamily: RH.fontMono, fontSize: 12, color: 'var(--cp-text-secondary, #475569)' }}>{formatDate(fw.end_date)}</td>
                  <td className="px-3 py-0" style={{ fontFamily: RH.fontMono, fontSize: 12, color: 'var(--cp-text-secondary, #475569)' }}>{daysBetween(fw.start_date, fw.end_date)} days</td>
                  <td className="px-3 py-0 max-w-[240px] truncate" style={{ color: 'var(--cp-text-tertiary, #64748B)' }} title={fw.reason || ''}>{fw.reason ? (fw.reason.length > 40 ? fw.reason.slice(0, 40) + '…' : fw.reason) : '—'}</td>
                  <td className="px-3 py-0">
                    <button onClick={() => handleDelete(fw.id, fw.name)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded flex items-center justify-center hover:bg-[#FEE2E2] text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #94A3B8))] hover:text-[var(--ds-text-danger,var(--ds-text-danger, #DC2626))]">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: RH.fontDisplay }}>Add Freeze Window</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-[12px] font-semibold text-[var(--ds-text-subtle,var(--ds-text-subtle, #475569))] block mb-1">Name *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Go-Live Freeze Q2"
                className="h-9 w-full px-3 rounded border border-[var(--ds-border,var(--ds-border, #E2E8F0))] dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))] bg-white dark:bg-[var(--ds-surface-raised,var(--ds-surface-raised, #1A1A1A))] dark:text-[var(--ds-text,var(--ds-text, #EDEDED))] text-[13px] placeholder:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #94A3B8))] focus:outline-none focus:ring-2 focus:ring-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))]/20 focus:border-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-semibold text-[var(--ds-text-subtle,var(--ds-text-subtle, #475569))] block mb-1">Start Date *</label>
                <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                  className="h-9 w-full px-3 rounded border border-[var(--ds-border,var(--ds-border, #E2E8F0))] dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))] bg-white dark:bg-[var(--ds-surface-raised,var(--ds-surface-raised, #1A1A1A))] dark:text-[var(--ds-text,var(--ds-text, #EDEDED))] text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))]/20 focus:border-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))]" />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[var(--ds-text-subtle,var(--ds-text-subtle, #475569))] block mb-1">End Date *</label>
                <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                  className="h-9 w-full px-3 rounded border border-[var(--ds-border,var(--ds-border, #E2E8F0))] dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))] bg-white dark:bg-[var(--ds-surface-raised,var(--ds-surface-raised, #1A1A1A))] dark:text-[var(--ds-text,var(--ds-text, #EDEDED))] text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))]/20 focus:border-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))]" />
              </div>
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[var(--ds-text-subtle,var(--ds-text-subtle, #475569))] block mb-1">Reason</label>
              <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="e.g. National holiday / major go-live" rows={3}
                className="w-full px-3 py-2 rounded border border-[var(--ds-border,var(--ds-border, #E2E8F0))] dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))] bg-white dark:bg-[var(--ds-surface-raised,var(--ds-surface-raised, #1A1A1A))] dark:text-[var(--ds-text,var(--ds-text, #EDEDED))] text-[13px] placeholder:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #94A3B8))] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))]/20 focus:border-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))]" />
            </div>
            {formError && <p className="text-[12px] text-[var(--ds-text-danger,var(--ds-text-danger, #DC2626))]">{formError}</p>}
          </div>
          <DialogFooter>
            <button onClick={() => { setShowModal(false); setForm({ name: '', start_date: '', end_date: '', reason: '' }); setFormError(''); }}
              className="h-9 px-4 rounded-md text-[13px] font-medium text-[var(--ds-text-subtle,var(--ds-text-subtle, #475569))] hover:bg-[var(--ds-surface-sunken,var(--ds-surface-sunken, #F1F5F9))] transition-colors">
              Cancel
            </button>
            <button onClick={handleCreate} disabled={createMut.isPending}
              className="h-9 px-4 rounded-md text-white text-[13px] font-semibold disabled:opacity-50 transition-colors"
              style={{ background: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))' }}>
              {createMut.isPending ? 'Adding...' : 'Add Freeze Window'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
