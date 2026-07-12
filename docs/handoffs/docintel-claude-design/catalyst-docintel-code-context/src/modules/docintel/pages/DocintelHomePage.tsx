import { useMemo, useState } from 'react';
import { Box, Inline, Stack, xcss } from '@atlaskit/primitives';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AtlaskitPageShell,
  Button,
  CatalystDrawer,
  EmptyState,
  Heading,
  PageHeader,
  Select,
  SectionMessage,
} from '@/components/ads';
import { useAuth } from '@/hooks/useAuth';
import { Routes } from '@/lib/routes';
import { ArtifactView } from '../components/ArtifactView';
import {
  DocintelIntentComposer,
  type DocintelIntentMode,
} from '../components/DocintelIntentComposer';
import { DocintelNavigation } from '../components/DocintelNavigation';
import { DocintelRecentWork } from '../components/DocintelRecentWork';
import { useActiveDocintelProject } from '../hooks/useActiveDocintelProject';
import {
  useDocintelDocuments,
  useDocintelProjects,
  useDocintelThemes,
  useRecentArtifacts,
} from '../hooks/useDocintel';

const contentStyles = xcss({
  paddingBlockStart: 'space.200',
  paddingBlockEnd: 'space.400',
  // ads-scanner:ignore-next-line -- ADS xcss token suffix, not a pixel value.
  paddingInline: 'space.300',
});

export default function DocintelHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [openArtifactId, setOpenArtifactId] = useState<string | null>(null);

  const projectsQuery = useDocintelProjects(user?.id);
  const projects = projectsQuery.data ?? [];
  const { activeProject, setActiveProjectKey } = useActiveDocintelProject(projects);
  const documentsQuery = useDocintelDocuments(activeProject?.id);
  const documents = useMemo(() => documentsQuery.data ?? [], [documentsQuery.data]);
  const themesQuery = useDocintelThemes(activeProject?.id);
  const themes = themesQuery.data ?? [];
  const artifactsQuery = useRecentArtifacts(activeProject?.id);

  const selectedSource = documents.find((document) => document.slug === params.get('source')) ?? null;
  const selectedTheme = themes.find((theme) => theme.id === params.get('theme')) ?? null;
  const intentParam = params.get('intent');
  const intentMode: DocintelIntentMode =
    intentParam === 'review' || intentParam === 'create' ? intentParam : 'ask';

  const projectOptions = projects.map((project) => ({
    value: project.key,
    label: project.name,
  }));
  const sourceOptions = documents
    .filter((document) => Boolean(document.slug))
    .map((document) => ({ value: document.slug!, label: document.title }));
  const themeOptions = themes.map((theme) => ({ value: theme.id, label: theme.name }));

  const attentionCount = useMemo(
    () => documents.filter((document) =>
      document.status === 'needs_review' || document.status === 'failed').length,
    [documents],
  );

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const chooseIntent = (intent: DocintelIntentMode) => setParam('intent', intent);

  return (
    <AtlaskitPageShell>
      <PageHeader
        title="Document Intelligence"
        actions={(
          <Button appearance="primary" onClick={() => navigate(Routes.docintel.upload())}>
            Upload source
          </Button>
        )}
      />
      <DocintelNavigation />
      <Box xcss={contentStyles}>
        <Stack space="space.400">
          <Stack space="space.100">
            <Heading level="h2" size="large">
              What do you need to understand or produce?
            </Heading>
            <p style={{ color: 'var(--ds-text-subtle)', margin: 0 }}>
              Ask grounded questions, review source-backed findings, and create cited deliverables.
            </p>
          </Stack>

          <Inline space="space.200" shouldWrap>
            <Select
              aria-label="Project scope"
              options={projectOptions}
              value={activeProject
                ? { value: activeProject.key, label: activeProject.name }
                : null}
              onChange={(option) => {
                if (!option) return;
                setActiveProjectKey(String(option.value));
              }}
              placeholder="Choose a project"
              isLoading={projectsQuery.isLoading}
            />
            <Select
              aria-label="Source scope"
              options={sourceOptions}
              value={selectedSource?.slug
                ? { value: selectedSource.slug, label: selectedSource.title }
                : null}
              onChange={(option) => setParam('source', option ? String(option.value) : null)}
              placeholder={documents.length > 0 ? 'All project sources' : 'No sources available'}
              isDisabled={!activeProject || documents.length === 0}
              isLoading={documentsQuery.isLoading}
              isClearable
            />
            <Select
              aria-label="Theme scope"
              options={themeOptions}
              value={selectedTheme
                ? { value: selectedTheme.id, label: selectedTheme.name }
                : null}
              onChange={(option) => setParam('theme', option ? String(option.value) : null)}
              placeholder="All themes"
              isDisabled={!activeProject || themes.length === 0}
              isLoading={themesQuery.isLoading}
              isClearable
            />
          </Inline>

          <DocintelIntentComposer
            key={intentMode}
            project={activeProject}
            sourcesAvailable={documents.length > 0}
            source={selectedSource?.slug ? {
              id: selectedSource.id,
              slug: selectedSource.slug,
              title: selectedSource.title,
            } : null}
            theme={selectedTheme ? { id: selectedTheme.id, name: selectedTheme.name } : null}
            initialMode={intentMode}
            onChooseScope={() => navigate({
              pathname: Routes.docintel.library(),
              search: activeProject ? `project=${encodeURIComponent(activeProject.key)}` : '',
            })}
          />

          <Stack space="space.150">
            <Heading level="h2" size="medium">Start with a proven task</Heading>
            <Inline space="space.100" shouldWrap>
              <Button onClick={() => chooseIntent('review')}>Review a BRD</Button>
              <Button onClick={() => chooseIntent('review')}>Find missing requirements</Button>
              <Button onClick={() => chooseIntent('ask')}>Ask about risks</Button>
              <Button onClick={() => chooseIntent('create')}>Create a cited deliverable</Button>
            </Inline>
          </Stack>

          {attentionCount > 0 ? (
            <SectionMessage appearance="warning" title="Needs your attention">
              {attentionCount} source{attentionCount === 1 ? '' : 's'} need review or recovery in
              the current project.
            </SectionMessage>
          ) : null}

          <DocintelRecentWork
            sources={documents.slice(0, 6)}
            deliverables={artifactsQuery.data ?? []}
            isLoading={documentsQuery.isLoading || artifactsQuery.isLoading}
            error={(documentsQuery.error ?? artifactsQuery.error) as Error | null}
            onOpenSource={(source) => {
              if (source.slug) navigate(Routes.docintel.workspace(source.slug));
            }}
            onOpenDeliverable={(deliverable) => setOpenArtifactId(deliverable.id)}
          />
        </Stack>
      </Box>

      <CatalystDrawer
        isOpen={Boolean(openArtifactId)}
        onClose={() => setOpenArtifactId(null)}
        label="Deliverable details"
        width="wide"
      >
        {openArtifactId ? <ArtifactView artifactId={openArtifactId} /> : null}
      </CatalystDrawer>
    </AtlaskitPageShell>
  );
}

interface PendingPageProps {
  title: string;
  header: string;
  description: string;
  showNavigation?: boolean;
}

function DocintelPendingPage({
  title,
  header,
  description,
  showNavigation = true,
}: PendingPageProps) {
  const navigate = useNavigate();

  return (
    <AtlaskitPageShell>
      <PageHeader title={title} />
      {showNavigation ? <DocintelNavigation /> : null}
      <Box xcss={contentStyles}>
        <EmptyState
          header={header}
          description={description}
          primaryAction={(
            <Button appearance="primary" onClick={() => navigate(Routes.docintel.library())}>
              Browse library
            </Button>
          )}
        />
      </Box>
    </AtlaskitPageShell>
  );
}

export function DocintelReviewPendingPage() {
  return (
    <DocintelPendingPage
      title="Review"
      header="Choose a document to review"
      description="Open a document from the library to inspect its evidence, facts, citations, and traceability."
      showNavigation={false}
    />
  );
}

export function DocintelThemesPendingPage() {
  return (
    <DocintelPendingPage
      title="Themes"
      header="Themes are not available in this view yet"
      description="Use the library to open a document and review its source-backed facts and evidence."
    />
  );
}

export function DocintelDeliverablesPendingPage() {
  return (
    <DocintelPendingPage
      title="Deliverables"
      header="Deliverables are not available in this view yet"
      description="Use the library to open a document and work with its existing artifacts."
    />
  );
}
