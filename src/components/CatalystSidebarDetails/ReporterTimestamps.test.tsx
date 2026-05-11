/**
 * ReporterTimestamps — Reporter and timestamps (F3.9)
 *
 * Contract:
 *   - Displays reporter name (read-only)
 *   - Shows created and updated timestamps
 *   - Formatted relative dates
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ReporterTimestamps } from './ReporterTimestamps';

describe('ReporterTimestamps (F3.9)', () => {
  it('renders reporter field label', () => {
    render(
      <ReporterTimestamps
        reporter="John Doe"
        createdAt="2026-05-01T10:00:00Z"
        updatedAt="2026-05-11T10:00:00Z"
      />
    );
    expect(screen.getByText(/reporter/i)).toBeInTheDocument();
  });

  it('displays reporter name', () => {
    render(
      <ReporterTimestamps
        reporter="John Doe"
        createdAt="2026-05-01T10:00:00Z"
        updatedAt="2026-05-11T10:00:00Z"
      />
    );
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
  });

  it('renders reporter as read-only (no edit)', () => {
    const { container } = render(
      <ReporterTimestamps
        reporter="John Doe"
        createdAt="2026-05-01T10:00:00Z"
        updatedAt="2026-05-11T10:00:00Z"
      />
    );
    expect(container.querySelector('input[type="text"]')).not.toBeInTheDocument();
  });

  it('displays created timestamp', () => {
    render(
      <ReporterTimestamps
        reporter="John Doe"
        createdAt="2026-05-01T10:00:00Z"
        updatedAt="2026-05-11T10:00:00Z"
      />
    );
    expect(screen.getByText(/created/i)).toBeInTheDocument();
    expect(screen.getByText(/may 1/i)).toBeInTheDocument();
  });

  it('displays updated timestamp', () => {
    render(
      <ReporterTimestamps
        reporter="John Doe"
        createdAt="2026-05-01T10:00:00Z"
        updatedAt="2026-05-11T10:00:00Z"
      />
    );
    expect(screen.getByText(/updated/i)).toBeInTheDocument();
    expect(screen.getByText(/may 11/i)).toBeInTheDocument();
  });

  it('shows relative time format', () => {
    render(
      <ReporterTimestamps
        reporter="John Doe"
        createdAt="2026-05-01T10:00:00Z"
        updatedAt="2026-05-11T10:00:00Z"
      />
    );
    expect(screen.getByText(/10 days ago/i)).toBeInTheDocument();
  });

  it('formats timestamps correctly', () => {
    const { container } = render(
      <ReporterTimestamps
        reporter="John Doe"
        createdAt="2026-05-01T10:00:00Z"
        updatedAt="2026-05-11T10:00:00Z"
      />
    );
    const timestamps = container.querySelectorAll('time');
    expect(timestamps.length).toBeGreaterThanOrEqual(2);
  });
});
