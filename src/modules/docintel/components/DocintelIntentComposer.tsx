import { useState, type ReactNode } from 'react';
import { Box, Stack, xcss } from '@atlaskit/primitives';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import { useNavigate } from 'react-router-dom';
import { Button, Heading, SectionMessage } from '@/components/ads';
import { Routes } from '@/lib/routes';
import { AskPanel } from './AskPanel';

export type DocintelIntentMode = 'ask' | 'review' | 'create';

export interface DocintelIntentProject {
  id: string;
  key: string;
  name: string;
}

export interface DocintelIntentSource {
  id: string;
  slug: string;
  title: string;
}

export interface DocintelIntentTheme {
  id: string;
  name: string;
}

export interface DocintelIntentComposerProps {
  project: DocintelIntentProject | null;
  sourcesAvailable: boolean;
  source?: DocintelIntentSource | null;
  theme?: DocintelIntentTheme | null;
  initialMode?: DocintelIntentMode;
  onChooseScope?: () => void;
}

const modes: DocintelIntentMode[] = ['ask', 'review', 'create'];

const composerStyles = xcss({
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
  borderRadius: 'border.radius.300',
  backgroundColor: 'elevation.surface.raised',
  // ads-scanner:ignore-next-line -- ADS xcss token suffix, not a pixel value.
  padding: 'space.300',
});

const panelStyles = xcss({
  paddingBlockStart: 'space.200',
});

function ComposerPrompt({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <Stack space="space.100">
      <Heading as="h3" size="small">{title}</Heading>
      <p style={{ margin: 0, color: 'var(--ds-text-subtle)' }}>{description}</p>
      <div>{action}</div>
    </Stack>
  );
}

function scopeDescription(
  project: DocintelIntentProject,
  sourcesAvailable: boolean,
  source?: DocintelIntentSource | null,
  theme?: DocintelIntentTheme | null,
): string {
  const parts = [project.name];

  if (!sourcesAvailable) {
    parts.push('No sources available');
  } else if (source) {
    parts.push(source.title);
  } else {
    parts.push('All project sources');
  }

  if (theme) parts.push(`Theme: ${theme.name}`);
  return parts.join(' · ');
}

export function DocintelIntentComposer({
  project,
  sourcesAvailable,
  source,
  theme,
  initialMode = 'ask',
  onChooseScope,
}: DocintelIntentComposerProps) {
  const navigate = useNavigate();
  const initialIndex = Math.max(0, modes.indexOf(initialMode));
  const [selectedModeIndex, setSelectedModeIndex] = useState(initialIndex);

  const openLibrary = () => {
    if (onChooseScope) {
      onChooseScope();
      return;
    }

    const search = new URLSearchParams();
    if (project?.key) search.set('project', project.key);
    navigate({ pathname: Routes.docintel.library(), search: search.toString() });
  };

  const openUpload = () => {
    const search = new URLSearchParams();
    if (project?.key) search.set('project', project.key);
    navigate({ pathname: Routes.docintel.upload(), search: search.toString() });
  };

  const startReview = () => {
    if (!project || !source) return;
    const search = new URLSearchParams({ project: project.key, source: source.slug });
    navigate({ pathname: Routes.docintel.review(), search: search.toString() });
  };

  const openCreateWorkspace = () => {
    if (!project || !source) return;
    const search = new URLSearchParams({ project: project.key });
    navigate({ pathname: Routes.docintel.workspace(source.slug), search: search.toString() });
  };

  const missingProject = (
    <ComposerPrompt
      title="Choose a project to continue"
      description="Document Intelligence needs a project before it can show or use source material."
      action={<Button onClick={openLibrary}>Open library</Button>}
    />
  );

  const missingSources = (
    <ComposerPrompt
      title="Add a source to continue"
      description="Upload a source document before asking questions, reviewing findings, or creating a deliverable."
      action={<Button appearance="primary" onClick={openUpload}>Upload source</Button>}
    />
  );

  const chooseSource = (intent: 'review' | 'create') => (
    <ComposerPrompt
      title={`Choose a source to ${intent}`}
      description={`Select one existing source from the library before you ${intent}.`}
      action={<Button appearance="primary" onClick={openLibrary}>Choose source</Button>}
    />
  );

  return (
    <Box xcss={composerStyles} testId="docintel-intent-composer">
      <Stack space="space.200">
        {project ? (
          <SectionMessage title="Current scope">
            {scopeDescription(project, sourcesAvailable, source, theme)}
          </SectionMessage>
        ) : null}

        <Tabs
          id="docintel-intent-modes"
          selected={selectedModeIndex}
          onChange={setSelectedModeIndex}
        >
          <TabList>
            <Tab>Ask</Tab>
            <Tab>Review</Tab>
            <Tab>Create</Tab>
          </TabList>

          <TabPanel>
            <Box xcss={panelStyles}>
              {!project ? missingProject : !sourcesAvailable ? missingSources : (
                <AskPanel
                  mode="hero"
                  projectId={project.id}
                  documentId={source?.id}
                  themeId={theme?.id}
                />
              )}
            </Box>
          </TabPanel>

          <TabPanel>
            <Box xcss={panelStyles}>
              {!project
                ? missingProject
                : !sourcesAvailable
                  ? missingSources
                  : !source
                    ? chooseSource('review')
                    : (
                      <ComposerPrompt
                        title={`Review ${source.title}`}
                        description="Open the review flow to inspect extracted findings and their source evidence."
                        action={<Button appearance="primary" onClick={startReview}>Start review</Button>}
                      />
                    )}
            </Box>
          </TabPanel>

          <TabPanel>
            <Box xcss={panelStyles}>
              {!project
                ? missingProject
                : !sourcesAvailable
                  ? missingSources
                  : !source
                    ? chooseSource('create')
                    : (
                      <ComposerPrompt
                        title={`Create from ${source.title}`}
                        description="Open the source workspace to create a cited deliverable from this document."
                        action={<Button appearance="primary" onClick={openCreateWorkspace}>Open source workspace</Button>}
                      />
                    )}
            </Box>
          </TabPanel>
        </Tabs>
      </Stack>
    </Box>
  );
}

export default DocintelIntentComposer;
