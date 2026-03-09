import React, { useState } from 'react';
import { X } from 'lucide-react';
import { RH } from '@/constants/releasehub.design';
import { parseSnowText } from '@/utils/releasehub.snparse';
import { useCreateChange } from '@/hooks/useReleaseHub';
import { toast } from 'sonner';

interface Props { onClose: () => void }

const CONFIDENCE_COLORS = { high: 'bg-[#DCFCE7] text-[#15803D]', medium: 'bg-[#FFFBEB] text-[#C2840A]', low: 'bg-[#FEF2F2] text-[#DC2626]' };

export function SNImportModal({ onClose }: Props) {
  const [raw, setRaw] = useState('');
  const [parsed, setParsed] = useState<ReturnType<typeof parseSnowText> | null>(null);
  const createChange = useCreateChange();

  const handleParse = () => {
    if (!raw.trim()) return;
    setParsed(parseSnowText(raw));
  };

  const handleConfirm = () => {
    if (!parsed) return;
    const { confidence, ...payload } = parsed;
    createChange.mutate({
      chg_number: payload.chg_number || `SN-${Date.now().toString().slice(-7)}`,
      title: payload.title || 'Imported SN Change',
      status: 'new',
      risk_level: 'low',
      source: 'servicenow',
      category: payload.category,
    }, {
      onSuccess: () => { toast.success('ServiceNow CHG imported'); onClose(); },
      onError: (err: any) => toast.error(err.message || 'Import failed'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-[#080E1D]/38 backdrop-blur-[1px]" />
      <div className="relative bg-white rounded-xl shadow-2xl w-[560px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-[16px] font-extrabold" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>Import ServiceNow CHG</h2>
          <button onClick={onClose} className="w-7 h-7 rounded flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9]"><X size={14} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[#475569] mb-1">Paste raw SN CHG text</label>
            <textarea value={raw} onChange={e => setRaw(e.target.value)} rows={8} placeholder="CHG0030659&#10;Category: Landing Page&#10;Frontend Required: Yes&#10;Frontend Details: d129ccf2&#10;..."
              className="w-full px-3 py-2 rounded-md border border-[#E2E8F0] text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
              style={{ fontFamily: RH.fontMono }} />
          </div>
          {!parsed ? (
            <button onClick={handleParse} disabled={!raw.trim()} className="h-9 px-4 rounded-md bg-[#2563EB] text-white text-[13px] font-semibold hover:bg-[#1D4ED8] disabled:opacity-50">
              Parse →
            </button>
          ) : (
            <div className="space-y-3">
              <h3 className="text-[13px] font-bold" style={{ color: RH.ink1 }}>Parsed Preview</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(parsed.confidence).map(([field, level]) => (
                  <div key={field} className="bg-[#F4F7FA] rounded-lg p-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-[#64748B]">{field.replace(/_/g, ' ')}</p>
                      <p className="text-[12px] font-medium" style={{ color: RH.ink2, fontFamily: RH.fontMono }}>{(parsed as any)[field] || '—'}</p>
                    </div>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${CONFIDENCE_COLORS[level]}`}>{level}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setParsed(null)} className="flex-1 h-9 rounded-md border border-[#E2E8F0] text-[13px] font-medium text-[#475569]">Re-parse</button>
                <button onClick={handleConfirm} disabled={createChange.isPending}
                  className="flex-1 h-9 rounded-md bg-[#15803D] text-white text-[13px] font-semibold hover:bg-[#166534] disabled:opacity-50">
                  {createChange.isPending ? 'Importing...' : 'Confirm Import →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
