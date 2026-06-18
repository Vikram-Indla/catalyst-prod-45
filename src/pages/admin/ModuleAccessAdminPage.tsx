// /admin/feature-flags — Module access admin.
// Tab 1 "Role access": the Role x Module matrix (admin_role_module_permissions) — primary.
// Tab 2 "Module availability": the existing org-wide on/off board (feature_flags), reused.
import React from 'react';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import { ModuleAccessMatrix } from '@/components/admin/module-access/ModuleAccessMatrix';
import FeatureFlagsPage from './FeatureFlagsPage';

export default function ModuleAccessAdminPage() {
  return (
    <div style={{ padding: '24px 32px', maxWidth: 1120, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 653, color: 'var(--ds-text, #172B4D)', margin: 0, lineHeight: '28px' }}>
        Module access
      </h1>
      <p style={{ fontSize: 14, fontWeight: 400, color: 'var(--ds-text-subtle, #44546F)', margin: '4px 0 24px' }}>
        Control which modules each role sees at login. Set per-role access to full, view, or hidden across the platform.
      </p>
      <Tabs id="module-access-tabs">
        <TabList>
          <Tab>Role access</Tab>
          <Tab>Module availability</Tab>
        </TabList>
        <TabPanel>
          <div style={{ width: '100%', paddingTop: 16 }}>
            <ModuleAccessMatrix />
          </div>
        </TabPanel>
        <TabPanel>
          <div style={{ width: '100%', paddingTop: 16 }}>
            <FeatureFlagsPage />
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}
