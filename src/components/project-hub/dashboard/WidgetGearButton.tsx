/**
 * WidgetGearButton — Standardized gear icon for the widget header.
 *
 * Always visible (FP-009). Shows a small blue dot when filters are active
 * (FP-010). Opens the per-gadget settings panel via popover.
 */
import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import GadgetSettingsPanel from './GadgetSettingsPanel';
import { useGadgetSettings, type GadgetType } from '@/hooks/useGadgetSettings';

interface Props {
  gadgetType: GadgetType;
  projectKey: string;
  projectId: string;
}

export default function WidgetGearButton({ gadgetType, projectKey, projectId }: Props) {
  const [open, setOpen] = useState(false);
  const { settings, save, clear, isDefault } = useGadgetSettings(gadgetType, projectKey);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Gadget settings"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            background: 'transparent',
            border: 0,
            padding: 4,
            cursor: 'pointer',
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            color: '#7A869A',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#F4F5F7')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Settings size={14} />
          {!isDefault && (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#0052CC',
                border: '1px solid #FFFFFF',
              }}
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="p-0"
        style={{
          width: 320,
          background: '#FFFFFF',
          border: '1px solid #DFE1E6',
          borderRadius: 4,
          boxShadow: '0 8px 24px rgba(9,30,66,.18)',
          padding: 0,
        }}
      >
        <GadgetSettingsPanel
          gadgetType={gadgetType}
          projectKey={projectKey}
          projectId={projectId}
          initialSettings={settings}
          onClose={() => setOpen(false)}
          onApply={(next) => {
            save(next);
            setOpen(false);
          }}
          onClearAll={() => {
            clear();
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
