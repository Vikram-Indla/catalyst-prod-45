/**
 * Variant 2 — Config-driven RoadmapEngine with epicRoadmapConfig
 * Shows the engine's chrome (toolbar, legend, filters) even without real program data.
 */
import React from 'react';
import { RoadmapEngine } from '@/components/roadmap/RoadmapEngine';
import { epicRoadmapConfig } from '@/config/roadmaps/epicRoadmapConfig';

const TODAY = new Date();
const DEMO_ITEMS = [
  {
    id: '1', title: 'Platform Migration', owner: 'Vikram Indla', theme: 'Infrastructure',
    startDate: `${TODAY.getFullYear()}-01-01`, endDate: `${TODAY.getFullYear()}-06-30`,
    status: 'in-progress', priority: 'high', progress: 45,
    description: 'Migrate legacy platform to new stack',
  },
  {
    id: '2', title: 'AI Features Release', owner: 'Saud Bindakheel', theme: 'Product',
    startDate: `${TODAY.getFullYear()}-03-01`, endDate: `${TODAY.getFullYear()}-09-30`,
    status: 'planned', priority: 'high', progress: 10,
    description: 'Release AI-powered features to production',
  },
  {
    id: '3', title: 'Mobile App v2', owner: 'Nada Alfassam', theme: 'Mobile',
    startDate: `${TODAY.getFullYear()}-05-01`, endDate: `${TODAY.getFullYear()}-12-31`,
    status: 'planned', priority: 'medium', progress: 0,
    description: 'Complete redesign of mobile application',
  },
  {
    id: '4', title: 'Security Compliance', owner: 'Yazeed Daraz', theme: 'Security',
    startDate: `${TODAY.getFullYear()}-02-01`, endDate: `${TODAY.getFullYear()}-04-30`,
    status: 'completed', priority: 'critical', progress: 100,
    description: 'SOC2 compliance certification',
  },
];

export default function RoadmapEngineVariant({ projectKey: _ }: { projectKey: string }) {
  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      <RoadmapEngine
        config={epicRoadmapConfig}
        items={DEMO_ITEMS as any}
        isLoading={false}
      />
    </div>
  );
}
