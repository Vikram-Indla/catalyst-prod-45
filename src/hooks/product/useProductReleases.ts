import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductRelease {
  id: string;
  product_id: string | null;
  name: string;
  start_date: string | null;
  end_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProductReleaseInput {
  product_id?: string | null;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
}

const QK = (productId?: string | null) =>
  ['product-releases', productId ?? 'all'] as const;

export function useProductReleases(productId?: string | null) {
  return useQuery({
    queryKey: QK(productId),
    queryFn: async () => {
      let q = supabase
        .from('product_releases')
        .select('id, product_id, name, start_date, end_date, created_by, created_at, updated_at')
        .order('name');
      if (productId) q = q.eq('product_id', productId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ProductRelease[];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateProductRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProductReleaseInput): Promise<ProductRelease> => {
      // Duplicate-name guard (per product scope)
      const { data: existing } = await supabase
        .from('product_releases')
        .select('id')
        .eq('name', input.name)
        .eq('product_id', input.product_id ?? '')
        .maybeSingle();
      if (existing) throw new Error(`Release "${input.name}" already exists`);

      const { data, error } = await supabase
        .from('product_releases')
        .insert({
          name: input.name,
          product_id: input.product_id ?? null,
          start_date: input.start_date ?? null,
          end_date: input.end_date ?? null,
        })
        .select('id, product_id, name, start_date, end_date, created_by, created_at, updated_at')
        .single();
      if (error) throw error;
      return data as ProductRelease;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK(vars.product_id) });
      qc.invalidateQueries({ queryKey: QK() });
    },
  });
}
