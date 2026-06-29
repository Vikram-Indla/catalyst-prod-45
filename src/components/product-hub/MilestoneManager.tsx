import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import Spinner from '@atlaskit/spinner';
import EmptyState from '@atlaskit/empty-state';
import Heading from '@atlaskit/heading';
import { supabase } from '@/integrations/supabase/client';
import { productMilestoneService } from '@/services/product-milestone.service';
import { MilestoneCard } from './MilestoneCard';
import type { ProductMilestoneWithProgress } from '@/types/product-milestone';

export interface MilestoneManagerProps {
  productCode: string;
}

function useProductId(productCode: string) {
  return useQuery({
    queryKey: ['product-by-code', productCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('code', productCode)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; name: string } | null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useMilestones(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-milestones', productId],
    queryFn: () => productMilestoneService.listMilestonesByProduct(productId!),
    enabled: !!productId,
  });
}

export function MilestoneManager({ productCode }: MilestoneManagerProps) {
  const queryClient = useQueryClient();
  const { data: product, isLoading: productLoading, error: productError } = useProductId(productCode);
  const { data: milestones = [], isLoading: milestonesLoading, error: milestonesError } = useMilestones(product?.id);

  const archiveMutation = useMutation({
    mutationFn: (id: string) => productMilestoneService.archiveMilestone(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['product-milestones', product?.id] }),
  });

  const isLoading = productLoading || milestonesLoading;
  const error = productError || milestonesError;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (error || !product) {
    const msg = error instanceof Error ? error.message : !product ? `Product "${productCode}" not found` : 'Unknown error';
    return (
      <div style={{ padding: '24px' }}>
        <EmptyState
          header="Failed to load milestones"
          description={msg}
          primaryAction={
            <Button
              appearance="primary"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['product-by-code', productCode] })}
            >
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 24px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <Heading size="xlarge">Milestones</Heading>
          <p style={{ margin: '2px 0 0', color: 'var(--ds-text-subtle)' }}>
            {product.name} · product delivery milestones
          </p>
        </div>
        <Button appearance="primary">
          Create milestone
        </Button>
      </div>

      {milestones.length === 0 ? (
        <EmptyState
          header="No milestones yet"
          description="Create your first milestone to start tracking product delivery targets."
          primaryAction={<Button appearance="primary">Create milestone</Button>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, paddingBottom: 24 }}>
          {milestones.map((milestone: ProductMilestoneWithProgress) => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              onDelete={(id) => archiveMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
