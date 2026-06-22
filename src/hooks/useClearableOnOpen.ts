import { useState } from 'react';

/**
 * useClearableOnOpen — Show clear (X) button only when dropdown is expanded.
 *
 * Returns `isClearable`, `onMenuOpen`, `onMenuClose` to wire into @atlaskit/select.
 * Pass these as props: `isClearable={isClearable} onMenuOpen={onMenuOpen} onMenuClose={onMenuClose}`
 *
 * Example:
 *   const { isClearable, onMenuOpen, onMenuClose } = useClearableOnOpen();
 *   <Select ... isClearable={isClearable} onMenuOpen={onMenuOpen} onMenuClose={onMenuClose} />
 */
export function useClearableOnOpen() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    isClearable: isOpen,
    onMenuOpen: () => setIsOpen(true),
    onMenuClose: () => setIsOpen(false),
  };
}
