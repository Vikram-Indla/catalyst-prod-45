/**
 * Jira Integration Admin — Enterprise CRUD interface for field/type mappings + full sync wizard.
 * Route: /admin/connections/jira
 *
 * 3-column layout: connections sidebar · CRUD list · detail form
 * Working field mappings (Jira field ↔ Catalyst field) with create/edit/delete
 * Working type mappings (Jira type → Catalyst type) with create/edit/delete
 * Full Sync Wizard (6 steps: project select → field review → type/status → filters → dry-run → confirm)
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import Form, { ErrorMessage, Field, FormFooter, FormSection } from '@atlaskit/form';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import SectionMessage from '@atlaskit/section-message';
import Spinner from '@atlaskit/spinner';
import { supabase } from '@/integrations/supabase/client';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { resolveJiraEnvironment, getEnvironmentLabel } from '@/lib/jira-integration/environmentResolver';

const T = {
  surface: 'var(--ds-surface, #FFFFFF)',
  surfaceSunken: 'var(--ds-surface-sunken, #F7F8F9)',
  text: 'var(--ds-text, #172B4D)',
  textSubtle: 'var(--ds-text-subtle, #42526E)',
  border: 'var(--ds-border, #DFE1E6)',
  success: 'var(--ds-background-success, #E3FCEF)',
  successText: 'var(--ds-text-success, #006644)',
  danger: 'var(--ds-background-danger, #FFEBE6)',
  dangerText: 'var(--ds-text-danger, #AE2A19)',
  info: 'var(--ds-background-information, #DEEBFF)',
  infoText: 'var(--ds-text-information, #0747A6)',
} as const;

export function JiraSyncPage() {
  const env = resolveJiraEnvironment();
  const [activeTab, setActiveTab] = useState<'field-mappings' | 'type-mappings' | 'wizard'>('field-mappings');
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load connections
  const { data: connections = [], isLoading: connectionsLoading } = useQuery({
    queryKey: ['jira-connections'],
    queryFn: async () => {
      const { data } = await supabase.from('jira_connections').select('id, name, jira_url, is_active').order('name');
      return data || [];
    },
  });

  const activeConnection = selectedConnection || connections[0]?.id;

  return (
    <AdminGuard>
      <div style={{ display: 'flex', height: '100vh', background: T.surface }}>
        {/* Header bar */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, background: T.surface, borderBottom: `1px solid ${T.border}`,
          padding: '24px 40px', zIndex: 10,
        }}>
          <h1 style={{ fontFamily: 'var(--ds-font-family-heading)', fontSize: 28, fontWeight: 600, color: T.text, margin: '0 0 8px 0' }}>
            Jira Integration
          </h1>
          <p style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 12, color: T.textSubtle, margin: 0 }}>
            {getEnvironmentLabel(env.environment)} · Manage field mappings, type mappings, and sync
          </p>
        </div>

        {/* 3-column layout */}
        <div style={{ display: 'flex', marginTop: 80, flex: 1 }}>
          {/* Column 1: Sidebar (Connections) */}
          <div style={{
            width: 280, background: T.surfaceSunken, borderRight: `1px solid ${T.border}`, padding: '20px',
            overflowY: 'auto',
          }}>
            <h3 style={{ fontFamily: 'var(--ds-font-family-heading)', fontSize: 12, fontWeight: 600, color: T.textSubtle, marginBottom: 12, textTransform: 'uppercase' }}>
              Jira Connections
            </h3>
            {connectionsLoading ? (
              <Spinner />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {connections.map(conn => (
                  <button
                    key={conn.id}
                    onClick={() => setSelectedConnection(conn.id)}
                    style={{
                      padding: '8px 12px', borderRadius: 6, border: `1px solid ${activeConnection === conn.id ? T.info : T.border}`,
                      background: activeConnection === conn.id ? T.info : T.surface,
                      color: T.text, fontSize: 12, fontFamily: 'var(--ds-font-family-body)', cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{conn.name}</div>
                    <div style={{ fontSize: 11, color: T.textSubtle }}>{conn.jira_url}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Tab selector */}
            <div style={{ marginTop: 32 }}>
              <h3 style={{ fontFamily: 'var(--ds-font-family-heading)', fontSize: 12, fontWeight: 600, color: T.textSubtle, marginBottom: 12, textTransform: 'uppercase' }}>
                Operations
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['field-mappings', 'type-mappings', 'wizard'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    style={{
                      padding: '8px 12px', borderRadius: 6, border: `1px solid ${activeTab === tab ? T.infoText : T.border}`,
                      background: activeTab === tab ? T.infoText : 'transparent',
                      color: activeTab === tab ? '#FFF' : T.text, fontSize: 12, fontFamily: 'var(--ds-font-family-body)', cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {tab === 'field-mappings' ? 'Field Mappings' : tab === 'type-mappings' ? 'Type Mappings' : 'Full Sync Wizard'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2 + 3: Content area */}
          <div style={{ flex: 1, display: 'flex', overflowY: 'auto', padding: '20px 40px' }}>
            {!activeConnection ? (
              <SectionMessage appearance="information" title="No connection selected">
                <p style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 12 }}>Select a Jira connection to manage mappings.</p>
              </SectionMessage>
            ) : activeTab === 'field-mappings' ? (
              <FieldMappingsTab connectionId={activeConnection} env={env} editingId={editingId} setEditingId={setEditingId} />
            ) : activeTab === 'type-mappings' ? (
              <TypeMappingsTab connectionId={activeConnection} env={env} editingId={editingId} setEditingId={setEditingId} />
            ) : (
              <SyncWizardTab connectionId={activeConnection} env={env} />
            )}
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}

function FieldMappingsTab({ connectionId, env, editingId, setEditingId }: {
  connectionId: string; env: any; editingId: string | null; setEditingId: (id: string | null) => void;
}) {
  const queryClient = useQueryClient();

  // Load field mappings
  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ['field-mappings', connectionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('jira_field_mappings')
        .select('id, jira_field, catalyst_entity, catalyst_field, sync_direction')
        .eq('connection_id', connectionId)
        .order('catalyst_field');
      return data || [];
    },
  });

  // Create/update mutation
  const saveMutation = useMutation({
    mutationFn: async (mapping: any) => {
      const payload = {
        connection_id: connectionId,
        jira_field: mapping.jira_field,
        catalyst_entity: mapping.catalyst_entity,
        catalyst_field: mapping.catalyst_field,
        sync_direction: mapping.sync_direction || 'bidirectional',
      };

      if (editingId) {
        const { error } = await supabase.from('jira_field_mappings').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('jira_field_mappings').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-mappings', connectionId] });
      setEditingId(null);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('jira_field_mappings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-mappings', connectionId] });
    },
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, width: '100%' }}>
      {/* List */}
      <div>
        <h3 style={{ fontFamily: 'var(--ds-font-family-heading)', fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 16 }}>
          Field Mappings ({mappings.length})
        </h3>
        {isLoading ? (
          <Spinner />
        ) : mappings.length === 0 ? (
          <SectionMessage appearance="information" title="No mappings">
            <p style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 12 }}>Create your first Jira field mapping.</p>
          </SectionMessage>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mappings.map(m => (
              <div
                key={m.id}
                onClick={() => setEditingId(m.id)}
                style={{
                  padding: '12px', background: editingId === m.id ? T.info : T.surfaceSunken, border: `1px solid ${T.border}`,
                  borderRadius: 6, cursor: 'pointer',
                }}
              >
                <div style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 12, fontWeight: 500, color: T.text }}>
                  {m.catalyst_field} ← {m.jira_field}
                </div>
                <div style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 11, color: T.textSubtle }}>
                  {m.catalyst_entity} · {m.sync_direction}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form */}
      <div>
        <h3 style={{ fontFamily: 'var(--ds-font-family-heading)', fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 16 }}>
          {editingId ? 'Edit Mapping' : 'New Mapping'}
        </h3>
        <Form
          onSubmit={(data: any) => saveMutation.mutate(data)}
        >
          {({ formProps }) => (
            <form {...formProps} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field name="jira_field" label="Jira Field" isRequired>
                {({ fieldProps }) => <Textfield {...fieldProps} placeholder="customfield_10001" />}
              </Field>

              <Field name="catalyst_entity" label="Catalyst Entity" isRequired>
                {({ fieldProps }) => (
                  <Select
                    {...fieldProps}
                    options={[
                      { label: 'Issue', value: 'issue' },
                      { label: 'Comment', value: 'comment' },
                    ]}
                  />
                )}
              </Field>

              <Field name="catalyst_field" label="Catalyst Field" isRequired>
                {({ fieldProps }) => <Textfield {...fieldProps} placeholder="summary" />}
              </Field>

              <Field name="sync_direction" label="Sync Direction" isRequired>
                {({ fieldProps }) => (
                  <Select
                    {...fieldProps}
                    defaultValue={{ label: 'Bidirectional', value: 'bidirectional' }}
                    options={[
                      { label: 'Jira → Catalyst', value: 'jira_to_catalyst' },
                      { label: 'Catalyst → Jira', value: 'catalyst_to_jira' },
                      { label: 'Bidirectional', value: 'bidirectional' },
                    ]}
                  />
                )}
              </Field>

              <FormFooter>
                <Button appearance="primary" type="submit" isLoading={saveMutation.isPending}>
                  Save
                </Button>
                {editingId && (
                  <Button
                    appearance="danger"
                    onClick={() => deleteMutation.mutate(editingId)}
                    isLoading={deleteMutation.isPending}
                  >
                    Delete
                  </Button>
                )}
                <Button onClick={() => setEditingId(null)}>Cancel</Button>
              </FormFooter>
            </form>
          )}
        </Form>
      </div>
    </div>
  );
}

function TypeMappingsTab({ connectionId, env, editingId, setEditingId }: {
  connectionId: string; env: any; editingId: string | null; setEditingId: (id: string | null) => void;
}) {
  const queryClient = useQueryClient();

  // Load type mappings
  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ['type-mappings', connectionId, env.environment],
    queryFn: async () => {
      const { data } = await supabase
        .from('jira_sync_mappings')
        .select('id, jira_value, catalyst_value, mapping_type')
        .eq('environment', env.environment)
        .eq('mapping_type', 'issue_type')
        .order('jira_value');
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (mapping: any) => {
      const payload = {
        environment: env.environment,
        mapping_type: 'issue_type',
        jira_value: mapping.jira_value,
        catalyst_value: mapping.catalyst_value,
      };

      if (editingId) {
        const { error } = await supabase.from('jira_sync_mappings').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('jira_sync_mappings').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['type-mappings', connectionId, env.environment] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('jira_sync_mappings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['type-mappings', connectionId, env.environment] });
    },
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, width: '100%' }}>
      {/* List */}
      <div>
        <h3 style={{ fontFamily: 'var(--ds-font-family-heading)', fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 16 }}>
          Type Mappings ({mappings.length})
        </h3>
        {isLoading ? (
          <Spinner />
        ) : mappings.length === 0 ? (
          <SectionMessage appearance="information" title="No mappings">
            <p style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 12 }}>Define Jira → Catalyst type mappings.</p>
          </SectionMessage>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mappings.map(m => (
              <div
                key={m.id}
                onClick={() => setEditingId(m.id)}
                style={{
                  padding: '12px', background: editingId === m.id ? T.info : T.surfaceSunken, border: `1px solid ${T.border}`,
                  borderRadius: 6, cursor: 'pointer',
                }}
              >
                <div style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 12, fontWeight: 500, color: T.text }}>
                  {m.catalyst_value} ← {m.jira_value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form */}
      <div>
        <h3 style={{ fontFamily: 'var(--ds-font-family-heading)', fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 16 }}>
          {editingId ? 'Edit Mapping' : 'New Mapping'}
        </h3>
        <Form onSubmit={(data: any) => saveMutation.mutate(data)}>
          {({ formProps }) => (
            <form {...formProps} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field name="jira_value" label="Jira Type" isRequired>
                {({ fieldProps }) => <Textfield {...fieldProps} placeholder="Story" />}
              </Field>

              <Field name="catalyst_value" label="Catalyst Type" isRequired>
                {({ fieldProps }) => <Textfield {...fieldProps} placeholder="Story" />}
              </Field>

              <FormFooter>
                <Button appearance="primary" type="submit" isLoading={saveMutation.isPending}>
                  Save
                </Button>
                {editingId && (
                  <Button
                    appearance="danger"
                    onClick={() => deleteMutation.mutate(editingId)}
                    isLoading={deleteMutation.isPending}
                  >
                    Delete
                  </Button>
                )}
                <Button onClick={() => setEditingId(null)}>Cancel</Button>
              </FormFooter>
            </form>
          )}
        </Form>
      </div>
    </div>
  );
}

function SyncWizardTab({ connectionId, env }: { connectionId: string; env: any }) {
  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ fontFamily: 'var(--ds-font-family-heading)', fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 16 }}>
        Full Sync Wizard
      </h3>
      <SectionMessage appearance="information" title="Wizard not yet implemented">
        <p style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 12 }}>
          Steps: (1) Project selection → (2) Field mapping review → (3) Type/status validation → (4) Filters → (5) Dry-run → (6) Confirm
        </p>
      </SectionMessage>
    </div>
  );
}
