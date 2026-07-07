/**
 * StrataSwitcher — Product-level switcher UI component
 *
 * Displays current product (Catalyst or STRATA) in the header and allows
 * users to switch between them. Integrates with existing ContextSwitcher.
 *
 * Mounted in: CatalystHeader (next to hub switcher)
 *
 * CAT-STRATA-ISOLATE-20260707-001
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import { token } from '@atlaskit/tokens';
import { useStrataSwitcher, useAvailableProducts, useProductDisplay } from '@/hooks/useStrataSwitcher';

/**
 * StrataSwitcher component
 *
 * Usage:
 * ```tsx
 * <StrataSwitcher />
 * ```
 *
 * Renders as a button in the header. Click to open product selector.
 */
export function StrataSwitcher() {
  const { current, switchTo, productName } = useStrataSwitcher();
  const products = useAvailableProducts();
  const display = useProductDisplay(current);
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleProductSelect = (productKey: 'CATALYST' | 'STRATA') => {
    switchTo(productKey);
    setIsOpen(false);
  };

  // Get trigger position for menu placement
  const getTriggerPosition = () => {
    if (!triggerRef.current) return { top: 0, left: 0 };
    const rect = triggerRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + 8,
      left: rect.left,
    };
  };

  return (
    <>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          backgroundColor: isOpen ? token('color.background.neutral.subtle') : 'transparent',
          border: `1px solid ${token('color.border')}`,
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 500,
          fontSize: '14px',
          color: token('color.text'),
          transition: 'background-color 0.2s',
        }}
        title={`Click to switch products (currently: ${productName})`}
      >
        <span>{display.emoji}</span>
        <span>{productName}</span>
        <ChevronDownIcon
          label=""
          size="small"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {/* Dropdown menu (portal-rendered) */}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${getTriggerPosition().top}px`,
              left: `${getTriggerPosition().left}px`,
              zIndex: 9999,
              backgroundColor: token('color.background.neutral'),
              border: `1px solid ${token('color.border')}`,
              borderRadius: '4px',
              boxShadow: token('shadow.overlay'),
              minWidth: '280px',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '12px 16px',
                borderBottom: `1px solid ${token('color.border')}`,
                fontSize: '12px',
                fontWeight: 600,
                color: token('color.text.subtlest'),
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Switch Product
            </div>

            {/* Product list */}
            <div style={{ padding: '8px' }}>
              {products.map((product) => {
                const isActive = product.key === current;
                return (
                  <button
                    key={product.id}
                    onClick={() => handleProductSelect(product.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: isActive
                        ? token('color.background.selected')
                        : 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: token('color.text'),
                      transition: 'background-color 0.15s',
                      fontSize: '14px',
                      fontWeight: isActive ? 600 : 500,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                          token('color.background.neutral.subtle');
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>{product.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{product.name}</div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: token('color.text.subtle'),
                          marginTop: '2px',
                        }}
                      >
                        {product.description}
                      </div>
                    </div>
                    {isActive && (
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: token('color.text.success'),
                          padding: '4px 8px',
                          backgroundColor: token('color.background.success'),
                          borderRadius: '3px',
                        }}
                      >
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer info */}
            <div
              style={{
                padding: '12px 16px',
                borderTop: `1px solid ${token('color.border')}`,
                fontSize: '11px',
                color: token('color.text.subtlest'),
                lineHeight: '1.4',
              }}
            >
              <strong>Note:</strong> Switching products reloads the page. Unsaved changes will be lost.
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
