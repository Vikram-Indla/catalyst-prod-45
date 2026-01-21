/**
 * Module 5A-1: Connector Manager - Main Dashboard
 */

import React, { useState, memo } from 'react';
import { Plus, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConnectors } from '../hooks/useConnectors';
import { ConnectorCard } from './ConnectorCard';
import { ConnectorFormModal } from './ConnectorFormModal';
import type { AutomationConnector } from '../types/connector';

export const ConnectorManager = memo(function ConnectorManager() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<AutomationConnector | null>(null);
  const { connectors, isLoading } = useConnectors(true);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50 px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Automation Connectors</h1>
              <p className="text-sm text-muted-foreground">Integrate with automation frameworks</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Connector
          </Button>
        </div>
      </header>

      {/* Connector Grid */}
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : connectors.length === 0 ? (
          <div className="text-center py-16">
            <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No connectors configured</h3>
            <p className="text-muted-foreground mb-4">Add your first automation framework connector</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Connector
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connectors.map(connector => (
              <ConnectorCard
                key={connector.id}
                connector={connector}
                onEdit={() => setSelectedConnector(connector)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      <ConnectorFormModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Edit Modal */}
      {selectedConnector && (
        <ConnectorFormModal
          open={!!selectedConnector}
          onClose={() => setSelectedConnector(null)}
          connector={selectedConnector}
        />
      )}
    </div>
  );
});
