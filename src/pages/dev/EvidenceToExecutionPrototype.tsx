/**
 * Evidence-to-Execution Prototype (Dev Only)
 *
 * Mocked prototype for BR-104: Industrial License Renewal Enhancement
 * - Shows mocked Business Request with Evidence-to-Execution action
 * - Modal to select evidence (attachments, comments, Figma, linked items)
 * - Global lock mechanism (one user at a time)
 * - Global progress in top navigation
 * - Evidence Pack page with tabs
 * - Generate Epics flow (mocked)
 *
 * NOT FOR PRODUCTION — dev-only route at /dev/product/evidence-to-execution
 */

import React, { useState } from 'react';
import { Suspense } from 'react';
import Button from '@atlaskit/button';
import { Heading, Stack, Inline } from '@atlaskit/primitives';
// Icon handled via emoji in the button
import { EvidencePackModal } from './components/EvidencePackModal';
import { EvidencePackPage } from './components/EvidencePackPage';
import { GlobalProgressIndicator } from './components/GlobalProgressIndicator';
import { GlobalLockBanner } from './components/GlobalLockBanner';
import { MockBusinessRequestView } from './components/MockBusinessRequestView';

// Mock data
const MOCK_BR_KEY = 'BR-104';

interface GlobalLockState {
  isActive: boolean;
  owner?: string;
  ownerRole?: string;
  progress?: number;
  currentStep?: string;
}

type ViewState = 'business-request' | 'evidence-pack' | 'generate-epics';

export default function EvidenceToExecutionPrototype() {
  const [viewState, setViewState] = useState<ViewState>('business-request');
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [globalLock, setGlobalLock] = useState<GlobalLockState>({
    isActive: false,
  });

  // Simulate global lock behavior
  const handlePrepareEvidence = () => {
    setShowEvidenceModal(true);
  };

  const handleConfirmEvidenceSelection = () => {
    // Mock: set global lock and start progress
    setGlobalLock({
      isActive: true,
      owner: 'Vikram Indla',
      ownerRole: 'vikramataol@gmail.com',
      progress: 0,
      currentStep: 'Collecting selected evidence',
    });
    setShowEvidenceModal(false);

    // Mock: simulate progress
    const steps = [
      'Collecting selected evidence',
      'Reading Business Request description',
      'Reading comments',
      'Extracting Arabic and English PDF text',
      'Reading screenshots and Figma evidence',
      'Indexing linked items',
      'Creating evidence chunks',
      'Creating vector index',
      'Building detailed summary',
      'Preparing generation options',
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        const progress = ((currentStep + 1) / steps.length) * 100;
        setGlobalLock((prev) => ({
          ...prev,
          progress: Math.round(progress),
          currentStep: steps[currentStep + 1] || steps[currentStep],
        }));
        currentStep++;
      } else {
        clearInterval(interval);
        // Mock: evidence pack ready
        setViewState('evidence-pack');
        setGlobalLock({
          isActive: false,
        });
      }
    }, 800);
  };

  // Show banner if lock is active
  if (globalLock.isActive && globalLock.owner) {
    return (
      <div style={{ padding: 32 }}>
        <GlobalLockBanner owner={globalLock.owner} itemKey={MOCK_BR_KEY} />
        <GlobalProgressIndicator
          progress={globalLock.progress || 0}
          currentStep={globalLock.currentStep}
          itemKey={MOCK_BR_KEY}
        />
      </div>
    );
  }

  if (viewState === 'evidence-pack') {
    return (
      <Suspense fallback={<div style={{ padding: 32 }}>Loading Evidence Pack...</div>}>
        <EvidencePackPage itemKey={MOCK_BR_KEY} />
      </Suspense>
    );
  }

  return (
    <div>
      {/* Global progress indicator (visible while processing) */}
      {globalLock.isActive && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}>
          <GlobalProgressIndicator
            progress={globalLock.progress || 0}
            currentStep={globalLock.currentStep}
            itemKey={MOCK_BR_KEY}
          />
        </div>
      )}

      {/* Mocked Business Request view with Evidence-to-Execution action */}
      <Suspense fallback={<div style={{ padding: 32 }}>Loading Business Request...</div>}>
        <MockBusinessRequestView
          itemKey={MOCK_BR_KEY}
          onEvidenceAction={handlePrepareEvidence}
        />
      </Suspense>

      {/* Evidence Pack Modal */}
      {showEvidenceModal && (
        <EvidencePackModal
          isOpen={showEvidenceModal}
          onClose={() => setShowEvidenceModal(false)}
          onConfirm={handleConfirmEvidenceSelection}
          itemKey={MOCK_BR_KEY}
        />
      )}
    </div>
  );
}
