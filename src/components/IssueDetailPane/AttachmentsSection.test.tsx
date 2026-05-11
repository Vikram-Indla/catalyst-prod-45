/**
 * AttachmentsSection — Attachments list and upload (F2.9)
 *
 * Contract:
 *   - Displays attachments list
 *   - Shows upload button
 *   - File picker integration
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AttachmentsSection } from './AttachmentsSection';

function renderSection(attachments: any = []) {
  return render(<AttachmentsSection issueKey="BAU-1" attachments={attachments} onUpload={() => {}} />);
}

describe('AttachmentsSection (F2.9)', () => {
  it('renders attachments section', () => {
    renderSection();
    expect(screen.getByRole('heading', { name: /attachments/i })).toBeInTheDocument();
  });

  it('displays list of attachments', () => {
    renderSection([
      { id: '1', filename: 'document.pdf', size: 1024 },
      { id: '2', filename: 'image.png', size: 2048 }
    ]);
    expect(screen.getByText(/document.pdf/i)).toBeInTheDocument();
    expect(screen.getByText(/image.png/i)).toBeInTheDocument();
  });

  it('shows empty state when no attachments', () => {
    renderSection([]);
    expect(screen.getByText(/no attachments/i)).toBeInTheDocument();
  });

  it('shows upload button', () => {
    renderSection();
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
  });

  it('has file input for upload', () => {
    const { container } = renderSection();
    expect(container.querySelector('input[type="file"]')).toBeInTheDocument();
  });

  it('displays file size', () => {
    renderSection([{ id: '1', filename: 'document.pdf', size: 1024 }]);
    expect(screen.getByText(/1\.0 kB/i)).toBeInTheDocument();
  });

  it('makes attachment filenames clickable', () => {
    renderSection([{ id: '1', filename: 'document.pdf', url: 'http://example.com/file.pdf' }]);
    expect(screen.getByRole('link', { name: /document.pdf/i })).toBeInTheDocument();
  });
});
