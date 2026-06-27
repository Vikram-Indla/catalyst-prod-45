import { useState, useEffect } from 'react';
import { productMilestoneService } from '@/services/product-milestone.service';
import type { ProductMilestoneWithProgress, MilestoneFilters } from '@/types/product-milestone';

export function useMilestones(productId: string, filters?: MilestoneFilters) {
  const [milestones, setMilestones] = useState<ProductMilestoneWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadMilestones();
  }, [productId, filters]);

  async function loadMilestones() {
    try {
      setLoading(true);
      setError(null);
      const data = await productMilestoneService.listMilestonesByProduct(productId, filters);
      setMilestones(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load milestones'));
    } finally {
      setLoading(false);
    }
  }

  return { milestones, loading, error, refetch: loadMilestones };
}
