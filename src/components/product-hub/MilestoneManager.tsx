import React, { useState, useEffect } from 'react';
import { MilestoneCard } from './MilestoneCard';
import { productMilestoneService } from '@/services/product-milestone.service';
import type { ProductMilestoneWithProgress } from '@/types/product-milestone';

export interface MilestoneManagerProps {
  productId: string;
}

export function MilestoneManager({ productId }: MilestoneManagerProps) {
  const [milestones, setMilestones] = useState<ProductMilestoneWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMilestones();
  }, [productId]);

  async function loadMilestones() {
    try {
      setLoading(true);
      setError(null);
      const data = await productMilestoneService.listMilestonesByProduct(productId);
      setMilestones(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load milestones';
      setError(message);
      console.error('Failed to load milestones:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await productMilestoneService.archiveMilestone(id);
      await loadMilestones();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete milestone';
      setError(message);
      console.error('Failed to delete milestone:', err);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading milestones...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Product Delivery Milestones</h2>
        <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium">
          Create Milestone
        </button>
      </div>

      {milestones.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          <p>No milestones yet. Create your first milestone to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {milestones.map((milestone) => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              onEdit={(id) => console.log('Edit milestone:', id)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
