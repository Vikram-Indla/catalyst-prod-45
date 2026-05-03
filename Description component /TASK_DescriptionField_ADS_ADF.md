# Claude Code Task: Description Field (ADS + ADF Implementation)

**Status:** READY FOR PHASE 0  
**Tier:** G2.5 Technical Discovery → G3  
**Owner:** Vikram Indla  
**Council Verdict:** Stop fighting ADS. Use @atlaskit/editor-core + ADF. Audit MIM first.

---

## OBJECTIVE

Implement Catalyst description field using:
- **Storage:** Atlassian Document Format (ADF) — JSON, not HTML
- **Editor:** @atlaskit/editor-core (ADS native)
- **Renderer:** @atlaskit/renderer (ADS native)
- **Images:** @atlaskit/media (ADS native)

**Non-goal:** Pixel-perfect Jira parity. Semantic parity (same data types, same features).

---

## PHASES

### **PHASE 0: AUDIT (Async, you own, 2 hrs)**

**Deliverable:** `DESCRIPTION_AUDIT.md` with categorized MIM descriptions

**Steps:**
1. Pull 10 real MIM project descriptions from Catalyst (or staging)
2. For each, screenshot/export and categorize:
   ```
   - [ ] Pure text only
   - [ ] + Line breaks / Newlines
   - [ ] + Bold/italic formatting
   - [ ] + Lists (ordered/unordered)
   - [ ] + Images (inline)
   - [ ] + Links
   - [ ] + Code blocks
   - [ ] + Jira/Catalyst links (embed)
   - [ ] + Custom formatting (highlights, tables, etc.)
   ```
3. Tally percentages
4. **Decision gate:** 
   - If 80%+ are text+basic → Proceed to PHASE 1
   - If 30%+ are complex embeds → Schedule council follow-up on scope

**Output format:**
```markdown
## MIM Description Audit Results

### Summary
- Total descriptions sampled: 10
- Pure text: 40% (4/10)
- Text + formatting: 30% (3/10)
- Text + images: 20% (2/10)
- Complex (embeds/custom): 10% (1/10)

### Recommendations
✓ Proceed with @atlaskit/editor-core
```

---

### **PHASE 1: SCHEMA & TYPES (Claude Code)**

**Goal:** Define ADF storage layer. Build types. Zero UI yet.

**Deliverables:**
- `adf.ts` — ADF TypeScript types (full coverage)
- `description.types.ts` — Catalyst description schema
- `db-migrations.sql` — Supabase schema updates
- `SCHEMA.md` — Documentation

**Implementation:**

#### 1a. **ADF Types** (`src/lib/adf.ts`)

Reference: [Atlassian Document Format Spec](https://developer.atlassian.com/cloud/jira/platform/apis/document/nodes/)

```typescript
// Core ADF node types
export type ADFContent = 
  | ParagraphNode
  | HeadingNode
  | BulletListNode
  | OrderedListNode
  | CodeBlockNode
  | ImageNode
  | LinkNode
  | TextNode;

export interface ParagraphNode {
  type: 'paragraph';
  content?: ADFContent[];
  marks?: Mark[];
}

export interface HeadingNode {
  type: 'heading';
  attrs: { level: 1 | 2 | 3 | 4 | 5 | 6 };
  content?: ADFContent[];
}

export interface ImageNode {
  type: 'image';
  attrs: {
    src: string;
    alt?: string;
    width?: number;
    height?: number;
  };
}

export interface TextNode {
  type: 'text';
  text: string;
  marks?: Mark[];
}

export interface Mark {
  type: 'em' | 'strong' | 'code' | 'link' | 'underline' | 'strikethrough';
  attrs?: { href?: string };
}

// Full document
export interface ADFDocument {
  version: 1;
  type: 'doc';
  content: ADFContent[];
}
```

**Tests:** Parse 5 sample ADF documents. Validate schema.

#### 1b. **Catalyst Description Schema** (`src/lib/description.types.ts`)

```typescript
export interface CatalystDescription {
  id: UUID;
  entity_id: UUID; // Which entity (release, project, story, etc.)
  entity_type: 'release' | 'project' | 'story' | 'defect' | 'epic';
  
  // ADF storage (JSON)
  content_adf: ADFDocument;
  
  // Metadata
  created_by: UUID;
  created_at: Timestamp;
  updated_by: UUID;
  updated_at: Timestamp;
  version: number;
  
  // Versioning
  is_latest: boolean;
  parent_version_id?: UUID; // For version history
  
  // Jira sync (if applicable)
  jira_issue_id?: string;
  jira_last_sync: Timestamp;
  
  // Soft-delete
  is_deleted: boolean;
  deleted_at?: Timestamp;
  deleted_by?: UUID;
}

export interface DescriptionVersion {
  id: UUID;
  description_id: UUID;
  version_number: number;
  content_adf: ADFDocument;
  changed_by: UUID;
  changed_at: Timestamp;
  change_summary?: string;
}
```

#### 1c. **Database Schema** (`migrations/001_description_tables.sql`)

```sql
-- Main description table
CREATE TABLE IF NOT EXISTS descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('release', 'project', 'story', 'defect', 'epic')),
  content_adf JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1,
  is_latest BOOLEAN NOT NULL DEFAULT true,
  parent_version_id UUID REFERENCES descriptions(id),
  jira_issue_id TEXT,
  jira_last_sync TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT descriptions_entity_composite UNIQUE (entity_id, entity_type, is_latest, is_deleted)
);

-- Indexes
CREATE INDEX idx_descriptions_entity ON descriptions(entity_id, entity_type);
CREATE INDEX idx_descriptions_jira ON descriptions(jira_issue_id) WHERE is_deleted = false;
CREATE INDEX idx_descriptions_latest ON descriptions(entity_id, is_latest) WHERE is_deleted = false;

-- Soft-delete guard
CREATE TRIGGER trg_guard_descriptions_no_delete
AFTER DELETE ON descriptions
FOR EACH ROW
EXECUTE FUNCTION raise_immutable_error('Descriptions use soft-delete. Set is_deleted=true.');

-- Version history table
CREATE TABLE IF NOT EXISTS description_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description_id UUID NOT NULL REFERENCES descriptions(id),
  version_number INTEGER NOT NULL,
  content_adf JSONB NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_summary TEXT,
  
  CONSTRAINT description_versions_unique UNIQUE (description_id, version_number)
);

CREATE INDEX idx_description_versions_id ON description_versions(description_id);

-- Grant RLS
ALTER TABLE descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE description_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies (read if user can see entity; write if user owns or is admin)
CREATE POLICY descriptions_read ON descriptions FOR SELECT USING (
  is_deleted = false AND (
    auth.uid() IN (SELECT user_id FROM user_workspaces) OR
    created_by = auth.uid()
  )
);

CREATE POLICY descriptions_write ON descriptions FOR UPDATE USING (
  created_by = auth.uid() OR auth.uid() IN (SELECT user_id FROM workspace_admins)
);
```

**Proof checklist:**
- [ ] Schema deployed to staging Supabase
- [ ] Tables visible in `information_schema.tables`
- [ ] RLS policies confirmed
- [ ] Soft-delete guard in place
- [ ] Indexes created

---

### **PHASE 2: EDITOR COMPONENT (Claude Code)**

**Goal:** Build rich-text editor surface using @atlaskit/editor-core.

**Deliverables:**
- `DescriptionEditor.tsx` — React component wrapping @atlaskit/editor
- `useDescriptionEditor.ts` — Custom hook (load/save/validate ADF)
- `editor.config.ts` — ADS theme + plugin config
- Tests: 5 QA checks (load → edit → save → ADF integrity)

**Implementation:**

#### 2a. **DescriptionEditor.tsx**

```typescript
import React, { useCallback, useState } from 'react';
import { EditorContext, Editor } from '@atlaskit/editor-core';
import { ADFDocument } from '@/lib/adf';
import { useDescriptionEditor } from './useDescriptionEditor';

interface DescriptionEditorProps {
  initialADF: ADFDocument;
  entityId: string;
  entityType: 'release' | 'project' | 'story' | 'defect' | 'epic';
  onChange?: (adf: ADFDocument) => void;
  onSave?: (adf: ADFDocument) => Promise<void>;
  readOnly?: boolean;
}

export const DescriptionEditor: React.FC<DescriptionEditorProps> = ({
  initialADF,
  entityId,
  entityType,
  onChange,
  onSave,
  readOnly = false,
}) => {
  const {
    editorState,
    setEditorState,
    toADF,
    isValid,
    isSaving,
    error,
  } = useDescriptionEditor(initialADF);

  const handleChange = useCallback(
    (editorView) => {
      setEditorState(editorView.state);
      const adf = toADF(editorView.state);
      if (isValid(adf)) {
        onChange?.(adf);
      }
    },
    [setEditorState, toADF, isValid, onChange]
  );

  const handleSave = useCallback(async () => {
    const adf = toADF(editorState);
    if (!isValid(adf)) {
      console.error('Invalid ADF. Cannot save.');
      return;
    }
    await onSave?.(adf);
  }, [editorState, toADF, isValid, onSave]);

  return (
    <EditorContext>
      <div className="description-editor" data-testid="description-editor">
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        
        <Editor
          appearance="full-page"
          allowPanel={true}
          allowDate={false}
          allowStatus={false}
          allowTables={false}
          allowCodeBlock={true}
          allowList={true}
          allowImage={true}
          allowLink={true}
          allowMention={false}
          allowTaskList={false}
          disabled={readOnly}
          onChange={handleChange}
          defaultValue={initialADF}
          media={{
            allowLinking: true,
            provider: createMediaProvider(), // See 2c
          }}
        />

        {!readOnly && (
          <div className="editor-actions">
            <button
              onClick={handleSave}
              disabled={isSaving || !isValid(editorState)}
            >
              {isSaving ? 'Saving...' : 'Save Description'}
            </button>
          </div>
        )}
      </div>
    </EditorContext>
  );
};
```

#### 2b. **useDescriptionEditor.ts**

```typescript
import { useState, useCallback } from 'react';
import { EditorState } from 'prosemirror-state';
import { ADFDocument } from '@/lib/adf';
import { validateADF } from '@/lib/adf-validator';

export function useDescriptionEditor(initialADF: ADFDocument) {
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toADF = useCallback((state: EditorState): ADFDocument => {
    // Convert ProseMirror state → ADF JSON
    return {
      version: 1,
      type: 'doc',
      content: state.doc.toJSON().content || [],
    } as ADFDocument;
  }, []);

  const isValid = useCallback((adf: ADFDocument): boolean => {
    try {
      validateADF(adf);
      setError(null);
      return true;
    } catch (e) {
      setError(`Validation error: ${e.message}`);
      return false;
    }
  }, []);

  return {
    editorState,
    setEditorState,
    toADF,
    isValid,
    isSaving,
    error,
  };
}
```

#### 2c. **Media Provider Setup**

```typescript
// src/lib/media-provider.ts
import { MediaProvider, ContextFactory } from '@atlaskit/media-core';
import { createContext } from 'react';

export function createMediaProvider(): MediaProvider {
  const contextFactory: ContextFactory = (
    collectionName,
    token,
    options
  ) => {
    // Integrate with Supabase storage
    return {
      collection: collectionName,
      token: token,
      uploadEndpoint: '/api/media/upload',
      getFileState: async (fileId: string) => {
        // Fetch from Supabase storage
        const response = await fetch(`/api/media/${fileId}`);
        return response.json();
      },
    };
  };

  return new MediaProvider({
    authProvider: async () => {
      const token = await getAuthToken(); // From your auth system
      return {
        token,
        clientId: process.env.REACT_APP_MEDIA_CLIENT_ID!,
      };
    },
  });
}
```

**QA Checkpoints (Phase 2):**
- [ ] Editor renders without errors
- [ ] Can type and format text (bold, italic, lists)
- [ ] Can add images (upload flow)
- [ ] Output ADF is valid JSON
- [ ] Save button triggers `onSave` callback

---

### **PHASE 3: RENDERER COMPONENT (Claude Code)**

**Goal:** Display ADF as read-only React component using @atlaskit/renderer.

**Deliverables:**
- `DescriptionRenderer.tsx` — React component wrapping @atlaskit/renderer
- `renderer.config.ts` — Theme config (ECLIPSE NOCTURNE colors)
- Tests: 5 QA checks (render ADF → compare snapshot → ADS compliance)

**Implementation:**

#### 3a. **DescriptionRenderer.tsx**

```typescript
import React from 'react';
import { ReactRenderer } from '@atlaskit/renderer';
import { ADFDocument } from '@/lib/adf';
import { rendererTheme } from './renderer.config';

interface DescriptionRendererProps {
  adf: ADFDocument;
  className?: string;
}

export const DescriptionRenderer: React.FC<DescriptionRendererProps> = ({
  adf,
  className,
}) => {
  if (!adf || !adf.content || adf.content.length === 0) {
    return (
      <div className={`description-empty ${className || ''}`}>
        <p>No description provided.</p>
      </div>
    );
  }

  return (
    <div
      className={`description-renderer ${className || ''}`}
      data-testid="description-renderer"
    >
      <ReactRenderer
        document={adf}
        appearance="default"
        theme={rendererTheme}
        media={{
          allowLinking: true,
        }}
      />
    </div>
  );
};
```

#### 3b. **renderer.config.ts**

```typescript
// Use V12 ECLIPSE NOCTURNE + FORGE tokens
import { colors } from '@/theme/tokens';

export const rendererTheme = {
  colors: {
    // Text
    text: colors.text.default, // #161A26
    textSubtle: colors.text.subtle, // #626F86
    
    // Backgrounds
    background: colors.bg.surface, // #FFFFFF
    backgroundSubtle: colors.bg.subtleNeutral, // #F1F2F4
    
    // Links
    link: colors.blue.text, // #0052CC
    linkVisited: colors.purple.text,
    
    // Code blocks
    codeBg: colors.bg.code, // #F7F8F9
    codeText: colors.text.code, // #AE2A19
  },
  fontSize: {
    p: '14px',
    h1: '29px',
    h2: '24px',
    h3: '20px',
    h4: '16px',
    h5: '14px',
    h6: '12px',
  },
  lineHeight: {
    default: '1.5',
    code: '1.6',
  },
};
```

**QA Checkpoints (Phase 3):**
- [ ] Renderer displays all ADF node types (heading, list, code, image)
- [ ] Colors match ECLIPSE NOCTURNE tokens
- [ ] Images render correctly (Supabase URLs)
- [ ] Links are clickable
- [ ] No layout shifts (ADS component width constraints respected)

---

### **PHASE 4: DATABASE WIRING (Claude Code)**

**Goal:** Connect editor ↔ Supabase. CRUD ops. End-to-end proof.

**Deliverables:**
- `descriptionApi.ts` — Supabase client (load/save/version)
- `useDescription.ts` — React hook (TanStack Query integration)
- Tests: CREATE, READ, UPDATE, VERSION (4 SQL proofs)

**Implementation:**

#### 4a. **descriptionApi.ts**

```typescript
import { supabase } from '@/lib/supabase';
import { ADFDocument } from '@/lib/adf';
import { CatalystDescription, DescriptionVersion } from '@/lib/description.types';

export const descriptionApi = {
  async getLatest(
    entityId: string,
    entityType: string
  ): Promise<CatalystDescription | null> {
    const { data, error } = await supabase
      .from('descriptions')
      .select('*')
      .eq('entity_id', entityId)
      .eq('entity_type', entityType)
      .eq('is_latest', true)
      .eq('is_deleted', false)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async save(
    entityId: string,
    entityType: string,
    contentADF: ADFDocument
  ): Promise<CatalystDescription> {
    // Fetch current latest
    const current = await this.getLatest(entityId, entityType);
    
    if (current) {
      // Mark old as not latest
      await supabase
        .from('descriptions')
        .update({ is_latest: false })
        .eq('id', current.id);

      // Archive to versions
      const { error: vError } = await supabase
        .from('description_versions')
        .insert({
          description_id: current.id,
          version_number: current.version,
          content_adf: current.content_adf,
          changed_by: (await supabase.auth.getUser()).data.user!.id,
          change_summary: 'Auto-archived',
        });

      if (vError) throw vError;
    }

    // Insert new latest
    const { data, error } = await supabase
      .from('descriptions')
      .insert({
        entity_id: entityId,
        entity_type: entityType,
        content_adf: contentADF,
        created_by: (await supabase.auth.getUser()).data.user!.id,
        updated_by: (await supabase.auth.getUser()).data.user!.id,
        version: (current?.version || 0) + 1,
        is_latest: true,
        parent_version_id: current?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getVersions(
    entityId: string,
    entityType: string
  ): Promise<DescriptionVersion[]> {
    const current = await this.getLatest(entityId, entityType);
    if (!current) return [];

    const { data, error } = await supabase
      .from('description_versions')
      .select('*')
      .eq('description_id', current.id)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return data;
  },

  async rollback(
    entityId: string,
    entityType: string,
    versionNumber: number
  ): Promise<CatalystDescription> {
    const versions = await this.getVersions(entityId, entityType);
    const target = versions.find((v) => v.version_number === versionNumber);

    if (!target) throw new Error(`Version ${versionNumber} not found`);

    return this.save(entityId, entityType, target.content_adf);
  },
};
```

#### 4b. **useDescription.ts** (TanStack Query)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { descriptionApi } from './descriptionApi';
import { ADFDocument } from '@/lib/adf';

export function useDescription(entityId: string, entityType: string) {
  const queryClient = useQueryClient();

  // Load
  const {
    data: description,
    isLoading,
    error: loadError,
  } = useQuery({
    queryKey: ['description', entityId, entityType],
    queryFn: () => descriptionApi.getLatest(entityId, entityType),
    staleTime: 5 * 60 * 1000, // 5 min
  });

  // Save
  const {
    mutate: saveDescription,
    isPending: isSaving,
    error: saveError,
  } = useMutation({
    mutationFn: (adf: ADFDocument) =>
      descriptionApi.save(entityId, entityType, adf),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['description', entityId, entityType],
      });
    },
  });

  // Versions
  const {
    data: versions = [],
    refetch: refetchVersions,
  } = useQuery({
    queryKey: ['description-versions', entityId, entityType],
    queryFn: () => descriptionApi.getVersions(entityId, entityType),
    enabled: !!description,
  });

  return {
    description: description?.content_adf,
    isLoading,
    isSaving,
    error: loadError || saveError,
    saveDescription,
    versions,
    refetchVersions,
  };
}
```

**SQL Proof Checklist (FORGE: PROOF BEFORE SCORE):**
- [ ] INSERT description → row created with correct ADF + version=1
- [ ] SELECT latest → returns is_latest=true row only
- [ ] UPDATE old → is_latest=false, archived to versions table
- [ ] ROLLBACK → can restore from versions table

---

### **PHASE 5: INTEGRATION (Claude Code + Lovable)**

**Goal:** Wire description editor/renderer into actual Catalyst surfaces.

**Surfaces to integrate:**
1. **ReleaseHub:** Release detail → Description tab
2. **ProjectHub:** Project profile → Description section
3. **StoryDetailModal:** Story description field
4. **Sign-off Queue:** Read-only description preview

**Implementation:**

#### 5a. **ReleaseDetail.tsx** (existing page)

```typescript
// Inside <ReleaseDetailTabs>
const [activeTab, setActiveTab] = useState<'overview' | 'description' | 'notes'>('overview');

{activeTab === 'description' && (
  <div className="release-description-section">
    <DescriptionEditor
      initialADF={description || { version: 1, type: 'doc', content: [] }}
      entityId={releaseId}
      entityType="release"
      onChange={(adf) => setDirty(true)}
      onSave={async (adf) => {
        await saveDescription(releaseId, 'release', adf);
        showNotification('Description saved');
      }}
    />
  </div>
)}
```

#### 5b. **StoryDetailModal.tsx** (existing component)

```typescript
// Inside modal body
<div className="modal-section">
  <h3>Description</h3>
  {isEditing ? (
    <DescriptionEditor
      initialADF={storyDescription}
      entityId={storyId}
      entityType="story"
      onSave={(adf) => saveStoryDescription(adf)}
    />
  ) : (
    <DescriptionRenderer adf={storyDescription} />
  )}
</div>
```

#### 5c. **SignOffQueue.tsx** (read-only)

```typescript
// Description preview (no editor)
<div className="queue-description-preview">
  {description && (
    <DescriptionRenderer
      adf={description}
      className="truncate-lines-3"
    />
  )}
</div>
```

**Integration Tests (DYNAMITE QA Phase 5):**
- [ ] ReleaseDetail: Edit description → Save → Refresh → Data persists
- [ ] StoryDetailModal: Render description with images → All images load
- [ ] SignOffQueue: Show 3 lines of description (truncate longer)
- [ ] All surfaces: Images render via Supabase CDN, not inline
- [ ] ADS compliance: No custom CSS, all colors from tokens

---

## SUCCESS CRITERIA (G3 GATE)

✅ **SCHEMA PROOF:** Descriptions table created, RLS active, soft-delete guard in place  
✅ **EDITOR PROOF:** Can open editor, type, format, save ADF to DB  
✅ **RENDERER PROOF:** Can view saved descriptions, images render correctly  
✅ **E2E PROOF:** User creates description in ReleaseDetail → Save → Reload → Description persists  
✅ **JIRA SYNC PROOF:** (Phase 2) Can import Jira description as ADF, display in Catalyst  
✅ **ADS COMPLIANCE:** All UI uses @atlaskit components. No custom rendering. ECLIPSE NOCTURNE colors locked.

---

## GATE DECISIONS (BLOCKING)

### Decision 1: Image Storage Location
- **Option A:** Supabase Storage (recommended) — managed, CDN included, aligned with Catalyst infra
- **Option B:** Jira Atlassian (if syncing from Jira) — requires auth token, slower
- **Decision:** Option A (Supabase) for MVP. Option B in Phase 2 if needed.

### Decision 2: Version History Depth
- **Option A:** Keep all versions (unbounded)
- **Option B:** Limit to last 10 versions (archival)
- **Decision:** Option A for now. Implement archival in Phase 3 if DB size becomes issue.

### Decision 3: Collaborative Editing
- **Option A:** Single-user edit (current UX) — simpler, no conflicts
- **Option B:** Real-time collab (Yjs, CRDT) — complex, later phase
- **Decision:** Option A (Phase 1). Revisit for Phase 2 if stakeholder request.

---

## ROLL-OUT PLAN

**Week 1:** Phase 0 (Audit) + Phase 1 (Schema)  
**Week 2:** Phase 2 (Editor) + Phase 3 (Renderer)  
**Week 3:** Phase 4 (DB Wiring) + Phase 5 (Integration)  
**Week 4:** QA, polish, production release

---

## MONITORING / CLAUDE.md UPDATES

After each phase, update `/repo/CLAUDE.md`:
```markdown
## Description Field (ADF + ADS)

**Status:** Phase X complete

**Implementation:**
- Storage: ADF (JSON) via Supabase
- Editor: @atlaskit/editor-core
- Renderer: @atlaskit/renderer
- Images: @atlaskit/media + Supabase storage

**Surfaces wired:**
- ReleaseHub (description tab)
- StoryDetailModal (description section)
- SignOffQueue (read-only preview)

**Lessons learned:**
- [Phase-specific notes]
```

---

## REFERENCES

- [Atlassian Document Format Spec](https://developer.atlassian.com/cloud/jira/platform/apis/document/)
- [@atlaskit/editor-core Docs](https://atlaskit.atlassian.com/packages/editor/editor-core)
- [@atlaskit/renderer Docs](https://atlaskit.atlassian.com/packages/editor/renderer)
- FORGE Pipeline: G2.5 Technical Discovery → G3 (Wiring + QA)
- DYNAMITE V2: 5 Stages (A=Schema, B=API, C=UI, D=Wiring, E=QA)

---

**Ready to start Phase 0 audit?**  
Confirm and I'll generate the audit template.
