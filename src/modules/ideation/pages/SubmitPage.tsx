/**
 * Ideation · Submit — /ideation/submit (also reachable via ?create=idea per D6).
 * Phase 2 S2: full-page host for the shared CreateIdeaForm (design 04 §C.3 —
 * same single-screen capture as the modal, zero divergence between hosts).
 */

import { HubPageHeader } from '@/components/layout/HubPageHeader';
import { CreateIdeaForm } from '@/modules/ideation/components/CreateIdeaModal';

export default function SubmitPage() {
  return (
    <div data-testid="ideation-submit-page">
      <HubPageHeader title="Submit idea" />
      <div style={{ padding: '0 16px 32px' }}>
        <CreateIdeaForm layout="page" />
      </div>
    </div>
  );
}
