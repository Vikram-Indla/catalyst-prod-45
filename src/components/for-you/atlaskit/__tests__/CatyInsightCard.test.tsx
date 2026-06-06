import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CatyInsightCard } from '../CatyInsightCard';

describe('CatyInsightCard', () => {
  it('renders title with sparkle prefix', () => {
    render(<CatyInsightCard title="Caty's brief">Hello</CatyInsightCard>);
    expect(screen.getByText("Caty's brief")).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders dismiss button that calls onDismiss', () => {
    const onDismiss = vi.fn();
    render(<CatyInsightCard title="Test" onDismiss={onDismiss}>Body</CatyInsightCard>);
    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('renders refresh button that calls onRefresh', () => {
    const onRefresh = vi.fn();
    render(<CatyInsightCard title="Test" onRefresh={onRefresh}>Body</CatyInsightCard>);
    fireEvent.click(screen.getByLabelText('Refresh'));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('shows spinner when loading', () => {
    render(<CatyInsightCard title="Test" isLoading>Body</CatyInsightCard>);
    expect(screen.getByTestId('caty-insight-spinner')).toBeInTheDocument();
  });

  it('hides body when loading', () => {
    render(<CatyInsightCard title="Test" isLoading>Body</CatyInsightCard>);
    expect(screen.queryByText('Body')).not.toBeInTheDocument();
  });

  it('does not render dismiss button when prop absent', () => {
    render(<CatyInsightCard title="Test">Body</CatyInsightCard>);
    expect(screen.queryByLabelText('Dismiss')).not.toBeInTheDocument();
  });
});
