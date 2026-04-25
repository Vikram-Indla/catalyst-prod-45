/**
 * WidgetGalleryModal — Atlaskit ModalDialog rebuild (Apr 25, 2026).
 *
 * Replaces the bespoke overlay + native checkboxes + hex colors with
 * @atlaskit/modal-dialog primitives via the Catalyst ADS wrapper. Focus
 * trap, ESC-to-close, click-outside-to-close, role="dialog" + aria-modal
 * + aria-labelledby are all provided by Atlaskit automatically.
 */
import { token } from '@atlaskit/tokens';
import { RotateCcw } from 'lucide-react';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  Button,
  Checkbox,
  Heading,
} from '@/components/ads';
import { WIDGET_REGISTRY, WIDGET_GROUPS } from './widget-registry';

interface WidgetGalleryModalProps {
  open: boolean;
  onClose: () => void;
  widgets: { id: string; visible: boolean }[];
  onToggleVisibility: (widgetId: string) => void;
  onReset: () => void;
}

export default function WidgetGalleryModal({
  open,
  onClose,
  widgets,
  onToggleVisibility,
  onReset,
}: WidgetGalleryModalProps) {
  const visibilityMap = new Map(widgets.map((w) => [w.id, w.visible]));

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      width="small"
      testId="widget-gallery-modal"
      shouldCloseOnOverlayClick={false}
    >
      <ModalHeader>
        <ModalTitle>Widget Gallery</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div
          style={{
            fontSize: 12,
            color: token('color.text.subtlest', '#6B6E76'),
            marginBottom: token('space.200', '16px'),
          }}
        >
          {WIDGET_REGISTRY.length} widgets available
        </div>

        {WIDGET_GROUPS.map((group, idx) => (
          <div
            key={group.key}
            style={{
              marginTop: idx === 0 ? 0 : token('space.300', '24px'),
            }}
          >
            <Heading as="h3" size="small">
              {group.label}
            </Heading>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: token('space.050', '4px'),
                marginTop: token('space.100', '8px'),
              }}
            >
              {WIDGET_REGISTRY.filter((w) => w.group === group.key).map((widget) => {
                const isVisible = visibilityMap.get(widget.id) ?? true;
                const labelNode = (
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: token('color.text', '#292A2E') }}>
                      {widget.title}
                    </span>
                    {widget.subtitle && (
                      <span style={{ fontSize: 12, color: token('color.text.subtle', '#505258') }}>
                        {widget.subtitle}
                      </span>
                    )}
                  </span>
                );
                return (
                  <Checkbox
                    key={widget.id}
                    isChecked={isVisible}
                    label={labelNode}
                    onChange={() => onToggleVisibility(widget.id)}
                    testId={`widget-gallery-checkbox-${widget.id}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </ModalBody>
      <ModalFooter>
        <Button
          appearance="subtle"
          iconBefore={<RotateCcw size={14} />}
          onClick={onReset}
          testId="widget-gallery-reset"
        >
          Reset to Defaults
        </Button>
        <Button appearance="primary" onClick={onClose} testId="widget-gallery-done">
          Done
        </Button>
      </ModalFooter>
    </Modal>
  );
}
