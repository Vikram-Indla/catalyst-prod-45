/**
 * WidgetGearButton — Atlaskit Popup rebuild (Apr 25, 2026).
 *
 * Replaces the shadcn Popover + bespoke <button> + hex palette with
 * @atlaskit/popup via the Catalyst ADS wrapper, anchored on Atlaskit's
 * IconButton (32×32 standard hit-target). Indicator dot routed through
 * the brand-bold token instead of legacy hex `#0052CC`.
 *
 * Atlaskit's IconButton from `@atlaskit/button/new` is used directly here
 * because the Popup trigger callback needs to forward `ref` + aria-*
 * props onto the anchor; the Catalyst <IconButton> wrapper drops those.
 *
 * Always visible (FP-009). Shows a small brand-colored dot when filters
 * are active (FP-010). Opens the per-gadget settings panel via popup.
 */
import { useState } from 'react';
import { Settings } from 'lucide-react';
import { token } from '@atlaskit/tokens';
import { IconButton as AkIconButton } from '@atlaskit/button/new';
import { Popup } from '@/components/ads';
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
    <Popup
      isOpen={open}
      onClose={() => setOpen(false)}
      placement="bottom-end"
      maxWidth={320}
      testId="widget-gear-popup"
      trigger={(triggerProps) => (
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <AkIconButton
            {...triggerProps}
            label="Gadget settings"
            icon={() => <Settings size={14} />}
            appearance="subtle"
            isSelected={open}
            onClick={() => setOpen((o) => !o)}
            testId="widget-gear-trigger"
          />
          {!isDefault && (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: token('color.background.brand.bold', '#0C66E4'),
                border: `1px solid ${token('elevation.surface', '#FFFFFF')}`,
                pointerEvents: 'none',
              }}
            />
          )}
        </span>
      )}
      content={() => (
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
      )}
    />
  );
}
