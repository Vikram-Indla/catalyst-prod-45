/**
 * Business Request detail view — renders the ACTUAL CatalystViewBusinessRequest.v3.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import CatalystViewBusinessRequestV3 from '@/components/catalyst-detail-views/business-request/CatalystViewBusinessRequest.v3';
import { ISSUES } from '../fixtures/production-data';

const brData = {
  ...ISSUES.businessRequest,
  id: 'br-001',
  request_key: ISSUES.businessRequest.issue_key,
  title: ISSUES.businessRequest.summary,
  product_id: 'prod-001',
  product_code: 'MDT',
  project_key: 'MDT',
  description: 'Enable investors to submit fast-track shipment requests directly from the portal.',
  description_adf: null,
  deleted_at: null,
  sprint_release: null,
  assignee_account_id: 'u-nada',
  reporter_account_id: null,
  process_step: 'On Hold',
};

function Seed({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  useEffect(() => {
    // Seed for useProductHubBusinessRequest
    qc.setQueryData(['product-hub-br', brData.request_key], brData);
    qc.setQueryData(['cv-watchers', brData.request_key], []);
    qc.setQueryData(['cv-activity', brData.id], []);
  }, [qc]);
  return <>{children}</>;
}

const meta: Meta = {
  title: 'Pages/Business Request',
  parameters: { layout: 'fullscreen' },
};
export default meta;

export const PanelMode: StoryObj = {
  render: () => (
    <Seed>
      <div style={{ height: 700, position: 'relative' }}>
        <CatalystViewBusinessRequestV3
          isOpen={true} onClose={fn()}
          itemId={brData.request_key} projectKey="MDT" panelMode
        />
      </div>
    </Seed>
  ),
};

export const FullPage: StoryObj = {
  render: () => (
    <Seed>
      <div style={{ height: 700, position: 'relative' }}>
        <CatalystViewBusinessRequestV3
          isOpen={true} onClose={fn()}
          itemId={brData.request_key} projectKey="MDT" fullPageMode
        />
      </div>
    </Seed>
  ),
};
