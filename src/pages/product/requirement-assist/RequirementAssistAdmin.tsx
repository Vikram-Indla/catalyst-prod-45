import React, { useState } from 'react';
import { Bot, FileText, Shield, Globe, BarChart3, Users, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  RAAdminAIConfiguration,
  RAAdminTemplates,
  RAAdminCompliance,
  RAAdminTranslation,
  RAAdminAnalytics,
} from './admin';

const adminTabs = [
  { id: 'ai', label: 'AI Configuration', icon: Bot },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'compliance', label: 'Compliance Rules', icon: Shield },
  { id: 'translation', label: 'Translation', icon: Globe },
  { id: 'analytics', label: 'Usage & Analytics', icon: BarChart3 },
  { id: 'roles', label: 'Roles & Access', icon: Users },
];

export default function RequirementAssistAdmin() {
  const [activeTab, setActiveTab] = useState('ai');

  const renderContent = () => {
    switch (activeTab) {
      case 'ai':
        return <RAAdminAIConfiguration />;
      case 'templates':
        return <RAAdminTemplates />;
      case 'compliance':
        return <RAAdminCompliance />;
      case 'translation':
        return <RAAdminTranslation />;
      case 'analytics':
        return <RAAdminAnalytics />;
      case 'roles':
        return (
          <div className="text-center py-12 text-muted-foreground">
            Roles & Access management coming soon...
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full">
      {/* Warning Banner */}
      <div className="fixed top-[108px] left-[220px] right-0 z-10 flex items-center gap-3 px-6 py-3.5 bg-amber-50 border-b border-amber-200 text-amber-700 text-[13px]">
        <AlertTriangle className="w-4 h-4" />
        <strong>Admin access required.</strong> Changes made here affect all users of Requirement Assist.
      </div>

      {/* Admin Sidebar */}
      <div className="w-[200px] bg-card border-r pt-[52px] flex-shrink-0">
        <div className="p-2">
          {adminTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[13px] transition-colors mb-1",
                activeTab === tab.id 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Admin Content */}
      <div className="flex-1 p-6 pt-[76px] overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
}
