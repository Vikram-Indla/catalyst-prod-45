import React, { useState } from 'react';
import { Plus, Package, RefreshCw, Upload } from 'lucide-react';

interface Props {
  onNewRelease: () => void;
  onNewChange: () => void;
  onImportSN?: () => void;
}

export function ReleaseHubFAB({ onNewRelease, onNewChange, onImportSN }: Props) {
  const [open, setOpen] = useState(false);

  const items = [
    { icon: Package, label: 'New Release', action: onNewRelease, key: 'R' },
    { icon: RefreshCw, label: 'New Change', action: onNewChange, key: 'C' },
    { icon: Upload, label: 'Import SN CHG', action: onImportSN || (() => {}), key: '' },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col-reverse items-end gap-2">
      {open && items.map((item, i) => (
        <button key={item.label}
          onClick={() => { item.action(); setOpen(false); }}
          className="flex items-center gap-2 h-10 pl-3 pr-4 rounded-full bg-white shadow-lg border border-[#E2E8F0] text-[13px] font-semibold text-[#1E293B] hover:bg-[#F8FAFC] animate-in fade-in slide-in-from-bottom-2"
          style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}>
          <item.icon size={14} className="text-[#2563EB]" />
          {item.label}
          {item.key && <kbd className="text-[9px] font-mono text-[#94A3B8] bg-[#F1F5F9] px-1 rounded">{item.key}</kbd>}
        </button>
      ))}
      <button onClick={() => setOpen(!open)}
        className="w-[52px] h-[52px] rounded-full bg-[#2563EB] text-white shadow-lg flex items-center justify-center hover:bg-[#1D4ED8] transition-all"
        style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}>
        <Plus size={24} />
      </button>
    </div>
  );
}
