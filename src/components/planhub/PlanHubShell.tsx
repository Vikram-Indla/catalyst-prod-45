import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, FolderOpen, GitCompare, Layers, Users, 
  Bot, FileBarChart, ChevronLeft 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import '@/styles/planhub.css';

// Import views
import PlanLibrary from './views/PlanLibrary';
import PlanEditor from './views/PlanEditor';
import ScenarioCompare from './views/ScenarioCompare';
import MasterPlan from './views/MasterPlan';
import ResourcesView from './views/ResourcesView';
import AIAssistant from './views/AIAssistant';
import ReportCenter from './views/ReportCenter';

import type { PlanHubView, FeatureSettings, AIFeatures } from '@/types/planhub.types';

export default function PlanHubShell() {
  const [activeView, setActiveView] = useState<PlanHubView>('library');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [features, setFeatures] = useState<FeatureSettings | null>(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    const unsubscribe = subscribeToSettings();
    return unsubscribe;
  }, []);

  const loadSettings = async () => {
    try {
      // Load feature settings
      const { data: settingsData } = await supabase
        .from('planhub_settings')
        .select('*')
        .eq('key', 'features')
        .single();
      
      if (settingsData) {
        setFeatures(settingsData.value as unknown as FeatureSettings);
      }

      // Load AI config
      const { data: aiData } = await supabase
        .from('planhub_ai_config')
        .select('features_enabled')
        .single();
      
      if (aiData) {
        const aiFeatures = aiData.features_enabled as unknown as AIFeatures;
        setAiEnabled(aiFeatures?.assistant_enabled || false);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToSettings = () => {
    const channel = supabase
      .channel('planhub-settings-user')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'planhub_settings' },
        () => loadSettings()
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'planhub_ai_config' },
        () => loadSettings()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    setActiveView('editor');
  };

  const handleBackToLibrary = () => {
    setSelectedPlanId(null);
    setActiveView('library');
  };

  // Navigation items with conditional rendering
  const navItems = [
    { id: 'library', label: 'Plan Library', icon: FolderOpen, show: true },
    { id: 'compare', label: 'Scenario Compare', icon: GitCompare, show: features?.scenario_compare },
    { id: 'master', label: 'Master Plan', icon: Layers, show: features?.master_plan_view },
    { id: 'resources', label: 'Resources', icon: Users, show: features?.resource_management },
    { id: 'ai', label: 'AI Assistant', icon: Bot, show: aiEnabled },
    { id: 'reports', label: 'Report Center', icon: FileBarChart, show: features?.report_center },
  ].filter(item => item.show);

  const renderView = () => {
    switch (activeView) {
      case 'library':
        return <PlanLibrary onPlanSelect={handlePlanSelect} />;
      case 'editor':
        return selectedPlanId ? (
          <PlanEditor planId={selectedPlanId} onBack={handleBackToLibrary} features={features} />
        ) : (
          <PlanLibrary onPlanSelect={handlePlanSelect} />
        );
      case 'compare':
        return <ScenarioCompare />;
      case 'master':
        return <MasterPlan />;
      case 'resources':
        return <ResourcesView planId={selectedPlanId} />;
      case 'ai':
        return <AIAssistant planId={selectedPlanId} />;
      case 'reports':
        return <ReportCenter planId={selectedPlanId} />;
      default:
        return <PlanLibrary onPlanSelect={handlePlanSelect} />;
    }
  };

  if (loading) {
    return (
      <div className="planhub-module">
        <div className="ph-shell">
          <div className="ph-flex ph-items-center ph-justify-center" style={{ flex: 1 }}>
            <div className="ph-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="planhub-module">
      <div className="ph-shell">
        {/* Sidebar */}
        <aside className="ph-sidebar">
          <div className="ph-sidebar-header">
            <div className="ph-sidebar-badge">
              <LayoutGrid size={18} />
            </div>
            <span className="ph-sidebar-title">PlanHub™</span>
          </div>

          <nav className="ph-sidebar-nav">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as PlanHubView)}
                className={`ph-nav-item ${activeView === item.id ? 'active' : ''}`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Back to Editor link when in sub-view */}
          {selectedPlanId && activeView !== 'editor' && activeView !== 'library' && (
            <div style={{ padding: 'var(--ph-space-4)', borderTop: '1px solid var(--ph-border)' }}>
              <button
                onClick={() => setActiveView('editor')}
                className="ph-btn ph-btn-secondary"
                style={{ width: '100%' }}
              >
                <ChevronLeft size={16} />
                Back to Plan
              </button>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="ph-main">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
