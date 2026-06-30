/**
 * useWhatsAppSummary — orchestrates the full flow:
 *   context builder → edge function → editable text → copy + toast.
 *
 * The hook owns all async state so the modal stays presentational.
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import type { JqlResultRow } from '@/hooks/workhub/useJqlResults';
import { getFilterSummaryContext, buildFallbackSummary } from './contextBuilder';
import type {
  WhatsAppSummaryOptions,
  WhatsAppSummaryState,
  FilterSummaryContext,
  GenerateSummaryResult,
} from './types';

const DEFAULT_OPTIONS: WhatsAppSummaryOptions = {
  summaryType: 'full',
  recipientRole: 'business_owner',
  maxItems: 20,
};

export function useWhatsAppSummary(
  filterName: string,
  filterJql: string,
  projectKey: string | null,
  rows: JqlResultRow[],
) {
  const [state, setState] = useState<WhatsAppSummaryState>({
    phase: 'idle',
    options: DEFAULT_OPTIONS,
    editableText: '',
    warnings: [],
    errorMessage: null,
    itemCountUsed: 0,
    isTruncated: false,
  });

  const setOptions = useCallback((patch: Partial<WhatsAppSummaryOptions>) => {
    setState(prev => ({ ...prev, options: { ...prev.options, ...patch } }));
  }, []);

  const setEditableText = useCallback((text: string) => {
    setState(prev => ({ ...prev, editableText: text }));
  }, []);

  const generate = useCallback(async (overrideOptions?: Partial<WhatsAppSummaryOptions>) => {
    if (rows.length === 0) {
      setState(prev => ({
        ...prev,
        phase: 'error',
        errorMessage: 'No items in this filter — nothing to summarise.',
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      phase: 'building_context',
      errorMessage: null,
      options: overrideOptions ? { ...prev.options, ...overrideOptions } : prev.options,
    }));

    const effectiveOptions = overrideOptions
      ? { ...state.options, ...overrideOptions }
      : state.options;

    // Step 1: build the sanitized context (deterministic, no network call)
    const ctx: FilterSummaryContext = getFilterSummaryContext(
      filterName,
      filterJql,
      projectKey,
      rows,
      effectiveOptions,
    );

    if (ctx.cappedItems.length === 0) {
      setState(prev => ({
        ...prev,
        phase: 'error',
        errorMessage: 'No items match the selected summary type. Try "Full update".',
      }));
      return;
    }

    setState(prev => ({ ...prev, phase: 'generating' }));

    // Step 2: call the edge function
    try {
      const { data, error } = await supabase.functions.invoke<GenerateSummaryResult>(
        'generate-whatsapp-summary',
        { body: ctx },
      );

      if (error || !data?.generatedText || (data as any)?.error) {
        const edgeError = (data as any)?.message ?? error?.message ?? 'AI returned no text.';
        console.warn('generate-whatsapp-summary error:', edgeError);
        const fallback = buildFallbackSummary(ctx);
        setState(prev => ({
          ...prev,
          phase: 'fallback',
          editableText: fallback,
          warnings: ['AI generation failed. Showing a count-based summary instead.'],
          errorMessage: edgeError,
          itemCountUsed: ctx.cappedItemCount,
          isTruncated: ctx.isTruncated,
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        phase: 'ready',
        editableText: data.generatedText,
        warnings: data.warnings ?? [],
        errorMessage: null,
        itemCountUsed: data.itemCountUsed,
        isTruncated: ctx.isTruncated,
      }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.warn('generate-whatsapp-summary unhandled:', msg);
      const fallback = buildFallbackSummary(ctx);
      setState(prev => ({
        ...prev,
        phase: 'fallback',
        editableText: fallback,
        warnings: ['AI generation failed. Showing a count-based summary instead.'],
        errorMessage: msg,
        itemCountUsed: ctx.cappedItemCount,
        isTruncated: ctx.isTruncated,
      }));
    }
  }, [rows, filterName, filterJql, projectKey, state.options]);

  const retry = useCallback(() => generate(), [generate]);

  const copyToClipboard = useCallback(() => {
    if (!state.editableText) return;
    navigator.clipboard.writeText(state.editableText).then(
      () => catalystToast.success('Copied', 'WhatsApp summary copied to clipboard'),
      () => catalystToast.error('Copy failed', 'Unable to access clipboard — please copy manually'),
    );
  }, [state.editableText]);

  const reset = useCallback(() => {
    setState({
      phase: 'idle',
      options: DEFAULT_OPTIONS,
      editableText: '',
      warnings: [],
      errorMessage: null,
      itemCountUsed: 0,
      isTruncated: false,
    });
  }, []);

  return { state, setOptions, setEditableText, generate, retry, copyToClipboard, reset };
}
