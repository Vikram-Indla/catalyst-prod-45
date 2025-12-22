// =====================================================
// EMPTY PROJECT STATE
// Default view when project has no features
// =====================================================

import React from 'react';
import { Rocket, Plus, FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyProjectStateProps {
  projectName: string;
  onCreateFeature?: () => void;
  onImport?: () => void;
}

export function EmptyProjectState({ 
  projectName, 
  onCreateFeature,
  onImport 
}: EmptyProjectStateProps) {
  return (
    <div className="h-full flex items-center justify-center p-8 bg-[#faf7f1]">
      <div className="text-center max-w-lg">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-[rgba(198,156,109,0.15)] flex items-center justify-center">
          <Rocket className="w-10 h-10 text-[#c69c6d]" />
        </div>

        {/* Welcome Message */}
        <h2 className="text-2xl font-bold mb-2">Welcome to {projectName}!</h2>
        
        <p className="text-gray-500 mb-8 text-lg">
          Your project is ready. Start by creating your first feature 
          or importing existing work items.
        </p>

        {/* Primary Actions */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <Button 
            onClick={onCreateFeature}
            size="lg"
            className="bg-[#c69c6d] hover:bg-[#b8894d] text-white"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create First Feature
          </Button>
          <Button 
            onClick={onImport}
            variant="outline"
            size="lg"
          >
            <Upload className="w-5 h-5 mr-2" />
            Import from CSV
          </Button>
        </div>

        {/* Getting Started */}
        <div className="p-6 rounded-xl bg-white border shadow-sm text-left">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#c69c6d]" />
            Getting Started
          </h3>
          
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#c69c6d] text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-medium">Create Features</p>
                <p className="text-sm text-gray-500">
                  Features represent major deliverables in your project
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#8b7355] text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-medium">Break Down into Stories</p>
                <p className="text-sm text-gray-500">
                  Add stories to features to track specific tasks
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#5c7c5c] text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-medium">Plan Releases</p>
                <p className="text-sm text-gray-500">
                  Assign stories to releases and track progress
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* View Options */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-white border text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-[rgba(59,130,246,0.1)] flex items-center justify-center">
              <svg className="w-5 h-5 text-[#3b82f6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <p className="font-medium text-sm">Board View</p>
            <p className="text-xs text-gray-500">Kanban workflow</p>
          </div>
          
          <div className="p-4 rounded-lg bg-white border text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-[rgba(92,124,92,0.15)] flex items-center justify-center">
              <svg className="w-5 h-5 text-[#5c7c5c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="font-medium text-sm">Timeline</p>
            <p className="text-xs text-gray-500">Gantt roadmap</p>
          </div>
          
          <div className="p-4 rounded-lg bg-white border text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-[rgba(139,115,85,0.15)] flex items-center justify-center">
              <svg className="w-5 h-5 text-[#8b7355]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <p className="font-medium text-sm">Feature Map</p>
            <p className="text-xs text-gray-500">Story mapping</p>
          </div>
        </div>
      </div>
    </div>
  );
}
