/**
 * API contract test for the admin-dialog shim (Block 2, admin Phase C, 2026-05-09).
 *
 * admin-dialog.tsx exports the same named symbols as @/components/ui/dialog so
 * call sites only need an import-path change. This test pins that contract so a
 * future refactor cannot silently break the public interface.
 *
 * Vitest run: CI only (local Node 20.12.2 is below vitest 4 minimum 20.19.0).
 */
import { describe, it, expect } from 'vitest';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../admin-dialog';
import {
  AdminAlertDialog,
} from '../admin-alert-dialog';

describe('admin-dialog named exports', () => {
  it('exports Dialog as a function', () => {
    expect(typeof Dialog).toBe('function');
  });

  it('exports DialogContent as a function', () => {
    expect(typeof DialogContent).toBe('function');
  });

  it('exports DialogHeader as a function', () => {
    expect(typeof DialogHeader).toBe('function');
  });

  it('exports DialogTitle as a function', () => {
    expect(typeof DialogTitle).toBe('function');
  });

  it('exports DialogFooter as a function', () => {
    expect(typeof DialogFooter).toBe('function');
  });

  it('exports DialogDescription as a function', () => {
    expect(typeof DialogDescription).toBe('function');
  });
});

describe('admin-alert-dialog named exports', () => {
  it('exports AdminAlertDialog as a function', () => {
    expect(typeof AdminAlertDialog).toBe('function');
  });
});
