/**
 * CatalystBanner — ADS-canonical page banner.
 * Replaces hand-rolled AnnouncementBanner in notifications/.
 */
import Banner from '@atlaskit/banner';
import { type ReactNode } from 'react';

interface CatalystBannerProps {
  children: ReactNode;
  appearance?: 'warning' | 'error' | 'announcement';
  isOpen?: boolean;
}

export function CatalystBanner({
  children,
  appearance = 'announcement',
  isOpen = true,
}: CatalystBannerProps) {
  return (
    <Banner appearance={appearance} isOpen={isOpen}>
      {children}
    </Banner>
  );
}
