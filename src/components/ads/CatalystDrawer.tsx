/**
 * CatalystDrawer — ADS-canonical side drawer.
 * Replaces hand-rolled sheet/drawer patterns across 17+ surfaces.
 */
import Drawer from '@atlaskit/drawer';
import { type ReactNode } from 'react';

interface CatalystDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  width?: 'narrow' | 'medium' | 'wide' | 'full';
}

export function CatalystDrawer({
  isOpen,
  onClose,
  label,
  children,
  width = 'wide',
}: CatalystDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      label={label}
      width={width}
    >
      {children}
    </Drawer>
  );
}
