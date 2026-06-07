/**
 * CatalystLink — ADS-canonical link component.
 * Uses @atlaskit/link with Catalyst routing integration.
 */
import Link from '@atlaskit/link';
import { type ReactNode } from 'react';

interface CatalystLinkProps {
  href: string;
  children: ReactNode;
  appearance?: 'default' | 'subtle';
  isExternal?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export function CatalystLink({
  href,
  children,
  appearance = 'default',
  isExternal = false,
  onClick,
}: CatalystLinkProps) {
  return (
    <Link
      href={href}
      appearance={appearance}
      target={isExternal ? '_blank' : undefined}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
