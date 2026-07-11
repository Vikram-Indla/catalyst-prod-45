import { useState } from 'react';
import { Box, Stack, xcss } from '@atlaskit/primitives';
import { RadioGroup } from '@atlaskit/radio';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AtlaskitPageShell,
  Button,
  EmptyState,
  Heading,
  PageHeader,
  SectionMessage,
  Spinner,
} from '@/components/ads';
import { useAuth } from '@/hooks/useAuth';
import { Routes } from '@/lib/routes';
import { DocintelSourcePicker } from '../components/DocintelSourcePicker';
import { useActiveDocintelProject } from '../hooks/useActiveDocintelProject';
import {
  useDocintelDocuments,
  useDocintelProjects,
  useDocumentVersions,
} from '../hooks/useDocintel';

type ReviewJob = 'brd-completeness' | 'requirements-quality' | 'test-readiness';
type ExpectedOutcome = 'findings-review' | 'cited-brd-preparation' | 'work-item-preparation';

const reviewJobOptions = [
  { label: 'BRD completeness', value: 'brd-completeness' },
  { label: 'Requirements quality', value: 'requirements-quality' },
  { label: 'Test readiness', value: 'test-readiness' },
];

const expectedOutcomeOptions = [
  { label: 'Findings review', value: 'findings-review' },
  { label: 'Cited BRD preparation', value: 'cited-brd-preparation' },
  { label: 'Work-item preparation', value: 'work-item-preparation' },
];

const contentStyles = xcss({
  // ads-scanner:ignore-next-line -- ADS xcss token suffix, not a pixel value.
  padding: 'space.300',
});

const decisionStyles = xcss({
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
  borderRadius: 'border.radius.200',
  // ads-scanner:ignore-next-line -- ADS xcss token suffix, not a pixel value.
  padding: 'space.300',
});

const centeredStyles = xcss({
  display: 'flex',
  justifyContent: 'center',
  paddingBlock: 'space.400',
});

const decisionsGridStyles = xcss({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 'space.200',
  alignItems: 'start',
});

export default function DocintelReviewStartPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [reviewJob, setReviewJob] = useState<ReviewJob>('brd-completeness');
  const [expectedOutcome, setExpectedOutcome] = useState<ExpectedOutcome>('findings-review');
  const [selectionOverride, setSelectionOverride] = useState<string | null | undefined>(undefined);

  const projectsQuery = useDocintelProjects(user?.id);
  const projects = projectsQuery.data ?? [];
  const { activeProject } = useActiveDocintelProject(projects);
  const documentsQuery = useDocintelDocuments(activeProject?.id);
  const documents = documentsQuery.data ?? [];
  const requestedSource = documents.find((document) => document.slug === params.get('source'));
  const selectedDocumentId = selectionOverride !== undefined
    ? selectionOverride
    : requestedSource?.id ?? null;
  const selectedDocument = documents.find((document) => document.id === selectedDocumentId) ?? null;
  const versionsQuery = useDocumentVersions(selectedDocument?.id);
  const latestVersion = versionsQuery.data?.[0] ?? null;

  const sourceReady = selectedDocument?.status === 'ready'
    || selectedDocument?.status === 'needs_review';
  const canStart = Boolean(activeProject && selectedDocument?.slug && sourceReady);

  const openUpload = () => {
    const search = new URLSearchParams();
    if (activeProject?.key) search.set('project', activeProject.key);
    navigate({ pathname: Routes.docintel.upload(), search: search.toString() });
  };

  const startReview = () => {
    if (!activeProject || !selectedDocument?.slug || !sourceReady) return;

    // Findings are currently document-current. We deliberately do not send a
    // historical version id because the workspace has no version-scoped facts contract.
    const search = new URLSearchParams({
      project: activeProject.key,
      view: 'findings',
    });
    navigate({
      pathname: Routes.docintel.workspace(selectedDocument.slug),
      search: search.toString(),
    });
  };

  if (projectsQuery.isLoading) {
    return (
      <AtlaskitPageShell>
        <PageHeader title="Start a document review" />
        <Box xcss={centeredStyles}><Spinner size="large" /></Box>
      </AtlaskitPageShell>
    );
  }

  if (projectsQuery.isError) {
    return (
      <AtlaskitPageShell>
        <PageHeader title="Start a document review" />
        <Box xcss={contentStyles}>
          <SectionMessage appearance="error" title="Projects could not be loaded">
            Refresh the page and try again.
          </SectionMessage>
        </Box>
      </AtlaskitPageShell>
    );
  }

  if (!activeProject) {
    return (
      <AtlaskitPageShell>
        <PageHeader title="Start a document review" />
        <EmptyState
          header="No project available"
          description="You need access to a project before choosing a source to review."
          primaryAction={<Button onClick={() => navigate(Routes.docintel.library())}>Open library</Button>}
        />
      </AtlaskitPageShell>
    );
  }

  return (
    <AtlaskitPageShell>
      <PageHeader title="Start a document review" />
      <Box xcss={contentStyles}>
        <Stack space="space.300">
          <SectionMessage title="Guided launch into current findings">
            Starting opens the selected source&apos;s current Findings view. It does not create or
            claim a persisted review record.
          </SectionMessage>

          <Box xcss={decisionsGridStyles}>
            <Box xcss={decisionStyles}>
              <Stack space="space.150">
                <Heading level="h2" size="medium" id="docintel-review-job-label">
                  1. Review job
                </Heading>
                <RadioGroup
                  aria-labelledby="docintel-review-job-label"
                  name="docintel-review-job"
                  value={reviewJob}
                  options={reviewJobOptions}
                  onChange={(event) => setReviewJob(event.target.value as ReviewJob)}
                />
              </Stack>
            </Box>

            <Box xcss={decisionStyles}>
              <Stack space="space.150">
                <Heading level="h2" size="medium">
                  2. Source and version
                </Heading>
                <SectionMessage title="Project scope">{activeProject.name}</SectionMessage>
                {documentsQuery.isLoading ? (
                  <Box xcss={centeredStyles}><Spinner size="medium" /></Box>
                ) : documentsQuery.isError ? (
                  <SectionMessage appearance="error" title="Sources could not be loaded">
                    Refresh the page and try again.
                  </SectionMessage>
                ) : documents.length === 0 ? (
                  <EmptyState
                    size="compact"
                    header="No sources available"
                    description="Upload a source before starting a review."
                    primaryAction={<Button appearance="primary" onClick={openUpload}>Upload source</Button>}
                  />
                ) : (
                  <>
                    <DocintelSourcePicker
                      documents={documents}
                      selectedDocumentId={selectedDocument?.id ?? null}
                      onChange={setSelectionOverride}
                      label="Source"
                    />
                    {selectedDocument ? (
                      <SectionMessage title="Active source version">
                        {versionsQuery.isLoading
                          ? 'Loading version…'
                          : latestVersion
                            ? `Latest available version: v${latestVersion.version_no}`
                            : 'Version unavailable'}
                      </SectionMessage>
                    ) : null}
                    {selectedDocument && !sourceReady ? (
                      <SectionMessage appearance="warning" title="Source is not ready for review">
                        Its current state is {selectedDocument.status.replace(/_/g, ' ')}.
                      </SectionMessage>
                    ) : null}
                  </>
                )}
              </Stack>
            </Box>

            <Box xcss={decisionStyles}>
              <Stack space="space.150">
                <Heading level="h2" size="medium" id="docintel-review-outcome-label">
                  3. Expected outcome
                </Heading>
                <RadioGroup
                  aria-labelledby="docintel-review-outcome-label"
                  name="docintel-review-outcome"
                  value={expectedOutcome}
                  options={expectedOutcomeOptions}
                  onChange={(event) => setExpectedOutcome(event.target.value as ExpectedOutcome)}
                />
              </Stack>
            </Box>
          </Box>

          <Button appearance="primary" isDisabled={!canStart} onClick={startReview}>
            Start review
          </Button>
        </Stack>
      </Box>
    </AtlaskitPageShell>
  );
}
