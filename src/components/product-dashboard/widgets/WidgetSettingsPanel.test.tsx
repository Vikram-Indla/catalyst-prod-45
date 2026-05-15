/**
 * WidgetSettingsPanel — gear-icon settings panel for configurable dashboard widgets.
 *
 * Contract (this test is the spec — implementation follows):
 *   - Accepts: widgetId, onClose callback, children (slot for widget-specific controls)
 *   - Renders a panel with data-testid="widget-settings-panel"
 *   - Renders a "Close" / X button that calls onClose
 *   - Renders a "Save" button that calls useWidgetSettings mutate and then onClose
 *   - Renders children inside the panel body
 *   - Shows a section heading "Widget Settings"
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { WidgetSettingsPanel } from './WidgetSettingsPanel';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('WidgetSettingsPanel', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders with data-testid="widget-settings-panel"', () => {
    render(
      <WidgetSettingsPanel widgetId="at-a-glance" onClose={onClose}>
        <div>settings content</div>
      </WidgetSettingsPanel>,
      { wrapper },
    );

    expect(screen.getByTestId('widget-settings-panel')).toBeInTheDocument();
  });

  it('renders the panel heading', () => {
    render(
      <WidgetSettingsPanel widgetId="at-a-glance" onClose={onClose}>
        <div />
      </WidgetSettingsPanel>,
      { wrapper },
    );

    expect(screen.getByRole('heading', { name: /widget settings/i })).toBeInTheDocument();
  });

  it('renders children inside the panel body', () => {
    render(
      <WidgetSettingsPanel widgetId="at-a-glance" onClose={onClose}>
        <div data-testid="custom-control">step picker</div>
      </WidgetSettingsPanel>,
      { wrapper },
    );

    expect(screen.getByTestId('custom-control')).toBeInTheDocument();
    expect(screen.getByText('step picker')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    render(
      <WidgetSettingsPanel widgetId="at-a-glance" onClose={onClose}>
        <div />
      </WidgetSettingsPanel>,
      { wrapper },
    );

    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders a Save button', () => {
    render(
      <WidgetSettingsPanel widgetId="at-a-glance" onClose={onClose}>
        <div />
      </WidgetSettingsPanel>,
      { wrapper },
    );

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });
});
