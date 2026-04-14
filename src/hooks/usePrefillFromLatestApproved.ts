/**
 * usePrefillFromLatestApproved — Clone/prefill hook for BAU-5364
 *
 * Selection logic (year priority):
 *   1. Check for latest Approved scanning request in 2024
 *   2. If none, check 2023
 *   3. If both exist, use 2024 only
 *   4. Ignore Draft / Returned / Rejected
 *
 * Cloning:
 *   - Clone product list + raw material list
 *   - Each record gets new clientId (no linkage to old request)
 *   - Audit log: source request ID + timestamp + actor=System
 */
import { useEffect, useState, useRef } from 'react';
import type {
  LineItem, PrefillStatus, EditableListDataProvider,
} from '@/lib/editable-list-provider';
import { cloneToLineItems } from '@/lib/editable-list-provider';

interface UsePrefillParams {
  targetYear: number;
  requestType: string;
  enabled: boolean;
  provider: EditableListDataProvider;
}

interface UsePrefillResult {
  status: PrefillStatus;
  sourceRequestId: string | null;
  sourceYear: number | null;
  products: LineItem[];
  rawMaterials: LineItem[];
  retry: () => void;
}

export function usePrefillFromLatestApproved({
  targetYear,
  requestType,
  enabled,
  provider,
}: UsePrefillParams): UsePrefillResult {
  const [status, setStatus] = useState<PrefillStatus>('idle');
  const [sourceRequestId, setSourceRequestId] = useState<string | null>(null);
  const [sourceYear, setSourceYear] = useState<number | null>(null);
  const [products, setProducts] = useState<LineItem[]>([]);
  const [rawMaterials, setRawMaterials] = useState<LineItem[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!enabled || requestType !== 'industrial-scanning') {
      setStatus('idle');
      return;
    }

    cancelledRef.current = false;

    (async () => {
      try {
        setStatus('loading');

        // Priority: 2024 first, then 2023
        const source2024 = await provider.findLatestApprovedRequest(2024);
        if (cancelledRef.current) return;

        const source2023 = source2024 ? null : await provider.findLatestApprovedRequest(2023);
        if (cancelledRef.current) return;

        const source = source2024 ?? source2023;
        const year = source2024 ? 2024 : source2023 ? 2023 : null;

        if (!source) {
          setStatus('no-source');
          setSourceRequestId(null);
          setSourceYear(null);
          setProducts([]);
          setRawMaterials([]);
          return;
        }

        const lineItems = await provider.fetchRequestLineItems(source.id);
        if (cancelledRef.current) return;

        const clonedProducts = cloneToLineItems(
          lineItems.products ?? [],
          'product',
          source.id,
        );

        const clonedRawMaterials = cloneToLineItems(
          lineItems.rawMaterials ?? [],
          'rawMaterial',
          source.id,
        );

        // Log the clone event
        await provider.logCloneEvent({
          sourceRequestId: source.id,
          targetYear,
          timestamp: new Date().toISOString(),
          actor: 'System',
          productsCopied: clonedProducts.length,
          rawMaterialsCopied: clonedRawMaterials.length,
        });

        if (cancelledRef.current) return;

        setSourceRequestId(source.id);
        setSourceYear(year);
        setProducts(clonedProducts);
        setRawMaterials(clonedRawMaterials);
        setStatus('cloned');
      } catch {
        if (!cancelledRef.current) setStatus('error');
      }
    })();

    return () => { cancelledRef.current = true; };
  }, [enabled, targetYear, requestType, provider, retryCount]);

  const retry = () => {
    setStatus('idle');
    setRetryCount(c => c + 1);
  };

  return { status, sourceRequestId, sourceYear, products, rawMaterials, retry };
}
