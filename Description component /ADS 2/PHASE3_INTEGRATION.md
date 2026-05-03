# Phase 3 Integration: Surface Examples

**Objective:** Wire description components into actual Catalyst surfaces.

**Surfaces:**
1. **ReleaseHub** — Release detail page
2. **StoryDetailModal** — Story detail modal
3. **SignOffQueue** — Read-only description preview

**All code uses:**
- @atlaskit/* components (ADS light theme)
- Phase 1-3 types & hooks
- DYNAMITE Stage D wiring (DB → API → Hook → Component → UI)

---

## 1. ReleaseHub Integration

**Path:** `src/pages/releasehub/ReleaseDetail.tsx`

### Context

ReleaseHub displays release details in tabs. The "Description" tab should show a rich-text editor where users can create/edit the release description.

### Implementation

```typescript
import React, { useState } from 'react';
import Tabs, { TabList, Tab, TabPanel } from '@atlaskit/tabs';
import { Box } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';

import { DescriptionEditor } from '@/components/DescriptionEditor';
import { DescriptionRenderer } from '@/components/DescriptionRenderer';
import { DescriptionErrorBoundary } from '@/components/errorBoundary';
import { useDescription } from '@/lib/useDescription';
import { createEmptyDocument } from '@/lib/adf';
import type { UUID } from '@/lib/description.types';

interface ReleaseDetailProps {
  releaseId: UUID;
}

export const ReleaseDetail: React.FC<ReleaseDetailProps> = ({ releaseId }) => {
  // =========================================================================
  // STATE
  // =========================================================================

  const [activeTab, setActiveTab] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);

  // =========================================================================
  // HOOKS: Load description via TanStack Query
  // =========================================================================

  const {
    description,
    content_adf,
    isLoading,
    isSaving,
    error: dbError,
    saveDescription,
  } = useDescription(releaseId, 'release');

  // =========================================================================
  // HANDLERS
  // =========================================================================

  const handleSaveDescription = async (adf: any) => {
    try {
      await saveDescription(adf, 'Edited via ReleaseHub');
      setIsEditing(false);
    } catch (err) {
      console.error('Save failed:', err);
      // Error boundary will handle this
    }
  };

  // =========================================================================
  // RENDERING
  // =========================================================================

  return (
    <div
      style={{
        padding: token('space.200'),
      }}
    >
      {/* ============================================================ */}
      {/* TABS */}
      {/* ============================================================ */}

      <Tabs id="release-tabs" onChange={(index) => setActiveTab(index)}>
        <TabList>
          <Tab>Overview</Tab>
          <Tab>Description</Tab>
          <Tab>Timeline</Tab>
          <Tab>Stakeholders</Tab>
        </TabList>

        {/* ============================================================ */}
        {/* DESCRIPTION TAB (our focus) */}
        {/* ============================================================ */}

        <TabPanel>
          <Box
            padding="space.200"
            style={{
              backgroundColor: token('color.background'),
            }}
          >
            {/* ============================================================ */}
            {/* EDITOR MODE */}
            {/* ============================================================ */}

            {isEditing ? (
              <DescriptionErrorBoundary level="error">
                <DescriptionEditor
                  entityId={releaseId}
                  entityType="release"
                  initialADF={content_adf || createEmptyDocument()}
                  autoSave={true}
                  autoSaveDelay={2000}
                  onSave={handleSaveDescription}
                  minHeight="300px"
                  maxHeight="800px"
                />
              </DescriptionErrorBoundary>
            ) : (
              /* ============================================================ */
              /* READ-ONLY MODE */
              /* ============================================================ */

              <div>
                {isLoading ? (
                  <p style={{ color: token('color.text.subtlest') }}>
                    Loading description...
                  </p>
                ) : content_adf && !dbError ? (
                  <DescriptionErrorBoundary level="warning">
                    <DescriptionRenderer adf={content_adf} expandable={true} />
                  </DescriptionErrorBoundary>
                ) : (
                  <p
                    style={{
                      color: token('color.text.subtlest'),
                      fontStyle: 'italic',
                    }}
                  >
                    No description yet. Click "Edit" to add one.
                  </p>
                )}

                {/* ============================================================ */}
                {/* EDIT BUTTON */}
                {/* ============================================================ */}

                {!isEditing && (
                  <div
                    style={{
                      marginTop: token('space.200'),
                      paddingTop: token('space.200'),
                      borderTop: `1px solid ${token('color.border')}`,
                    }}
                  >
                    <Button
                      appearance="primary"
                      onClick={() => setIsEditing(true)}
                    >
                      Edit Description
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================ */}
            {/* ERROR DISPLAY */}
            {/* ============================================================ */}

            {dbError && (
              <div
                style={{
                  marginTop: token('space.100'),
                  padding: token('space.100'),
                  backgroundColor: token('color.background.danger'),
                  border: `1px solid ${token('color.border.danger')}`,
                  borderRadius: token('border.radius.100'),
                  color: token('color.text.danger'),
                }}
              >
                ⚠️ {dbError.message}
              </div>
            )}
          </Box>
        </TabPanel>
      </Tabs>
    </div>
  );
};
```

### DYNAMITE Stage D Proof:

1. ✅ **Load:** `useDescription(releaseId, 'release')` → TanStack Query → `descriptionApi.getLatest()` → DB SELECT → React state
2. ✅ **Display:** `content_adf` rendered via `DescriptionRenderer` + `@atlaskit/renderer`
3. ✅ **Edit:** User clicks "Edit" → `DescriptionEditor` opens
4. ✅ **Save:** User saves → `saveDescription()` → `descriptionApi.save()` → DB INSERT → Query invalidated → UI updates

---

## 2. StoryDetailModal Integration

**Path:** `src/components/StoryDetailModal.tsx`

### Context

StoryDetailModal displays story details in a modal. The description section should show a compact renderer with edit capability.

### Implementation

```typescript
import React, { useState } from 'react';
import Modal, { ModalBody, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Tabs, { TabList, Tab, TabPanel } from '@atlaskit/tabs';
import Button from '@atlaskit/button';
import { token } from '@atlaskit/tokens';

import { DescriptionEditor } from '@/components/DescriptionEditor';
import { EnhancedRenderer } from '@/components/DescriptionRendererEnhanced';
import { DescriptionErrorBoundary } from '@/components/errorBoundary';
import { useDescription } from '@/lib/useDescription';
import { createEmptyDocument } from '@/lib/adf';
import type { UUID } from '@/lib/description.types';

interface StoryDetailModalProps {
  storyId: UUID;
  onClose: () => void;
}

export const StoryDetailModal: React.FC<StoryDetailModalProps> = ({
  storyId,
  onClose,
}) => {
  // =========================================================================
  // STATE
  // =========================================================================

  const [editingDescription, setEditingDescription] = useState(false);

  // =========================================================================
  // HOOKS
  // =========================================================================

  const { content_adf, saveDescription } = useDescription(storyId, 'story');

  // =========================================================================
  // HANDLERS
  // =========================================================================

  const handleSave = async (adf: any) => {
    await saveDescription(adf, 'Updated in StoryDetailModal');
    setEditingDescription(false);
  };

  // =========================================================================
  // RENDERING
  // =========================================================================

  return (
    <Modal onClose={onClose} width="xlarge">
      <ModalHeader>
        <ModalTitle>Story Details</ModalTitle>
      </ModalHeader>

      <ModalBody>
        <Tabs id="story-tabs">
          <TabList>
            <Tab>Overview</Tab>
            <Tab>Description</Tab>
            <Tab>Subtasks</Tab>
            <Tab>Comments</Tab>
          </TabList>

          {/* ============================================================ */}
          {/* DESCRIPTION TAB */}
          {/* ============================================================ */}

          <TabPanel>
            <div
              style={{
                padding: token('space.200'),
              }}
            >
              {editingDescription ? (
                /* ============================================================ */
                /* EDIT MODE */
                /* ============================================================ */

                <DescriptionErrorBoundary>
                  <DescriptionEditor
                    entityId={storyId}
                    entityType="story"
                    initialADF={content_adf || createEmptyDocument()}
                    onSave={handleSave}
                    minHeight="250px"
                    maxHeight="500px"
                  />
                </DescriptionErrorBoundary>
              ) : (
                /* ============================================================ */
                /* READ MODE */
                /* ============================================================ */

                <div>
                  {content_adf ? (
                    <DescriptionErrorBoundary>
                      <EnhancedRenderer
                        adf={content_adf}
                        expandable={true}
                        maxLines={10}
                        showImageModal={true}
                      />
                    </DescriptionErrorBoundary>
                  ) : (
                    <p
                      style={{
                        color: token('color.text.subtlest'),
                        fontStyle: 'italic',
                      }}
                    >
                      No description
                    </p>
                  )}

                  {/* ============================================================ */}
                  {/* EDIT BUTTON */}
                  {/* ============================================================ */}

                  <Button
                    appearance="subtle"
                    onClick={() => setEditingDescription(true)}
                    style={{
                      marginTop: token('space.100'),
                    }}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>
          </TabPanel>
        </Tabs>
      </ModalBody>
    </Modal>
  );
};
```

### DYNAMITE Stage D Proof:

1. ✅ **Load:** Hook loads description from DB
2. ✅ **Display:** `EnhancedRenderer` shows description with image modal
3. ✅ **Edit:** Editor opens in modal
4. ✅ **Save:** Persists to DB, UI updates immediately

---

## 3. SignOffQueue Integration

**Path:** `src/pages/releasehub/SignOffQueue.tsx`

### Context

SignOffQueue shows a list of releases awaiting sign-off. For each release, display a truncated description preview (non-editable).

### Implementation

```typescript
import React from 'react';
import { Box } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import { DynamicTable } from '@atlaskit/dynamic-table';

import { DescriptionRendererPreview } from '@/components/DescriptionRenderer';
import { DescriptionErrorBoundary } from '@/components/errorBoundary';
import { useDescriptionReadOnly } from '@/lib/useDescription';
import type { Release, UUID } from '@/types';

interface SignOffQueueProps {
  releases: Release[];
}

export const SignOffQueue: React.FC<SignOffQueueProps> = ({ releases }) => {
  // =========================================================================
  // TABLE COLUMNS
  // =========================================================================

  const head = {
    cells: [
      { key: 'name', content: 'Release' },
      { key: 'description', content: 'Description' },
      { key: 'owner', content: 'Owner' },
      { key: 'status', content: 'Status' },
      { key: 'actions', content: '' },
    ],
  };

  // =========================================================================
  // TABLE ROWS
  // =========================================================================

  const rows = releases.map((release) => ({
    key: release.id,
    cells: [
      { key: 'name', content: release.name },
      {
        key: 'description',
        content: (
          <DescriptionCell releaseId={release.id} />
        ),
      },
      { key: 'owner', content: release.owner },
      { key: 'status', content: release.status },
      {
        key: 'actions',
        content: (
          <Button
            appearance="primary"
            size="small"
            onClick={() => handleSignOff(release.id)}
          >
            Sign Off
          </Button>
        ),
      },
    ],
  }));

  // =========================================================================
  // RENDERING
  // =========================================================================

  return (
    <DynamicTable
      head={head}
      rows={rows}
      rowsPerPage={10}
      defaultPage={1}
    />
  );
};

/**
 * Cell component that loads and displays description
 */
const DescriptionCell: React.FC<{ releaseId: UUID }> = ({ releaseId }) => {
  // =========================================================================
  // HOOKS: Load for read-only display
  // =========================================================================

  const { content_adf, isLoading, error } = useDescriptionReadOnly(
    releaseId,
    'release'
  );

  // =========================================================================
  // RENDERING
  // =========================================================================

  if (isLoading) {
    return (
      <span style={{ color: token('color.text.subtlest') }}>Loading...</span>
    );
  }

  if (error) {
    return (
      <span style={{ color: token('color.text.danger') }}>Error loading</span>
    );
  }

  return (
    <DescriptionErrorBoundary level="warning">
      <div
        style={{
          maxWidth: '400px',
          maxHeight: '80px',
          overflow: 'hidden',
          color: token('color.text.subtlest'),
          fontSize: '13px',
        }}
      >
        {content_adf ? (
          <DescriptionRendererPreview adf={content_adf} />
        ) : (
          <em>No description</em>
        )}
      </div>
    </DescriptionErrorBoundary>
  );
};
```

### DYNAMITE Stage D Proof:

1. ✅ **Load:** `useDescriptionReadOnly()` → TanStack Query → DB SELECT → React state per row
2. ✅ **Display:** `DescriptionRendererPreview` shows truncated text (2-3 lines)
3. ✅ **Performance:** Lightweight hook, no editor overhead
4. ✅ **Error Handling:** Graceful fallback if load fails

---

## 4. Common Patterns

### Pattern A: With Version History

If you want to show version history sidebar:

```typescript
import { useDescriptionVersions } from '@/lib/useDescription';

function DescriptionWithHistory({ releaseId }: { releaseId: UUID }) {
  const { content_adf } = useDescription(releaseId, 'release');
  const { versions } = useDescriptionVersions(releaseId, 'release');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: token('space.200') }}>
      {/* Main content */}
      <DescriptionRenderer adf={content_adf} />

      {/* Sidebar: versions */}
      <div style={{ overflowY: 'auto', maxHeight: '600px' }}>
        <h4>History</h4>
        {versions.map((v) => (
          <Button
            key={v.id}
            appearance="subtle"
            onClick={() => handleRollback(v.version_number)}
          >
            Version {v.version_number}
          </Button>
        ))}
      </div>
    </div>
  );
}
```

### Pattern B: With Diff View

Show changes between current and previous version:

```typescript
function DescriptionWithDiff({ releaseId }: { releaseId: UUID }) {
  const { content_adf, versions } = useDescription(releaseId, 'release');
  const previousVersion = versions[1]; // Second in list

  return (
    <EnhancedRenderer
      adf={content_adf}
      compareWith={previousVersion?.content_adf}
    />
  );
}
```

### Pattern C: With Image Upload Modal

Allow inline image uploads in editor:

```typescript
function DescriptionWithImageUpload({ releaseId, entityType }: Props) {
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleImageUpload = async (file: File) => {
    const result = await uploadImage(file, releaseId, entityType, (progress) => {
      setUploadProgress(progress.percentage);
    });
    return result.src; // Return CDN URL for insertion into ADF
  };

  return (
    <DescriptionEditor
      entityId={releaseId}
      entityType={entityType}
      onImageUpload={handleImageUpload}
    />
  );
}
```

---

## 5. ADS Compliance Checklist

Before deploying, verify all surfaces:

- [ ] **Colors:** All from `token()` (no hardcoded hex)
- [ ] **Components:** All @atlaskit/* (editor, renderer, button, modal, tabs)
- [ ] **Spacing:** All from `token('space.*')`
- [ ] **Border radius:** All from `token('border.radius.*')`
- [ ] **Typography:** Default ADS font scale
- [ ] **No custom CSS:** No `<style>` tags or .css files

---

## 6. Testing Integration

```typescript
// cypress test example
describe('ReleaseHub Description Integration', () => {
  it('Should load, edit, and persist description', () => {
    cy.visit('/releasehub/release/test-id');

    // Load
    cy.contains('Edit Description').should('be.visible');

    // Edit
    cy.contains('button', 'Edit Description').click();
    cy.get('[contenteditable]').type('New release notes');

    // Save
    cy.contains('button', 'Save').click();
    cy.contains('Saved').should('be.visible');

    // Verify persisted
    cy.reload();
    cy.contains('New release notes').should('be.visible');
  });
});
```

---

## Summary

Phase 3 integration is complete when:

✅ **ReleaseHub:** Description tab shows editor (editable) + renderer (view)  
✅ **StoryDetailModal:** Description section with inline edit  
✅ **SignOffQueue:** Description preview in table cells (read-only)  
✅ **All surfaces:** Use error boundary, ADS compliance, DYNAMITE Stage D wiring verified

---

**Next:** Run integration tests on staging, then production rollout.
