import * as React from "react";
import {
  Plus,
  Search,
  ChevronRight,
  Save,
  Trash2,
  Sparkles,
} from "lucide-react";
import {
  Button,
  TextField,
  Field,
  Select,
  Checkbox,
  RadioGroup,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  SectionMessage,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  TabsWithPanels,
} from "..";

/**
 * Catalyst Design System — Showcase page.
 *
 * Mount this at `/design-system`:
 *   <Route path="/design-system" element={<Showcase />} />
 */

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <section className="flex flex-col gap-[var(--ds-space-200)] py-[var(--ds-space-400)] border-b border-[var(--ds-color-border-subtle)]">
    <h2 className="text-[length:var(--ds-font-size-500)] font-[number:var(--ds-font-weight-semibold)] text-[var(--ds-color-text)]">
      {title}
    </h2>
    {children}
  </section>
);

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="flex flex-col gap-[var(--ds-space-100)]">
    <span className="text-[length:var(--ds-font-size-075)] uppercase tracking-wider text-[var(--ds-color-text-subtlest)]">
      {label}
    </span>
    <div className="flex flex-wrap items-start gap-[var(--ds-space-150)]">
      {children}
    </div>
  </div>
);

const TokenSwatch: React.FC<{ name: string; cssVar: string }> = ({ name, cssVar }) => (
  <div className="flex flex-col gap-[var(--ds-space-050)] min-w-[180px]">
    <div
      className="h-10 rounded-[var(--ds-radius-100)] border border-[var(--ds-color-border-subtle)]"
      style={{ background: `var(${cssVar})` }}
    />
    <span className="text-[length:var(--ds-font-size-100)] text-[var(--ds-color-text)] font-[number:var(--ds-font-weight-medium)]">
      {name}
    </span>
    <code className="text-[length:var(--ds-font-size-075)] text-[var(--ds-color-text-subtlest)]">
      {cssVar}
    </code>
  </div>
);

export default function Showcase() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [agree, setAgree] = React.useState(false);
  const [radio, setRadio] = React.useState("weekly");
  const [selectVal, setSelectVal] = React.useState<string | undefined>();
  const [tab, setTab] = React.useState(0);

  return (
    <div className="min-h-screen bg-[var(--ds-elevation-surface)] text-[var(--ds-color-text)] font-[var(--ds-font-family-body)]">
      <div className="max-w-[1100px] mx-auto px-[var(--ds-space-400)] py-[var(--ds-space-600)]">
        <header className="flex flex-col gap-[var(--ds-space-100)] pb-[var(--ds-space-400)] border-b border-[var(--ds-color-border-subtle)]">
          <span className="text-[length:var(--ds-font-size-075)] uppercase tracking-wider text-[var(--ds-color-text-subtlest)]">
            Catalyst Design System
          </span>
          <h1 className="text-[length:var(--ds-font-size-700)] leading-[var(--ds-line-height-600)] font-[number:var(--ds-font-weight-bold)]">
            Components Showcase
          </h1>
          <p className="text-[length:var(--ds-font-size-300)] text-[var(--ds-color-text-subtle)]">
            Atlassian-shaped APIs · Catalyst skin · Radix primitives.
          </p>
        </header>

        {/* ──────────────── TOKENS ──────────────── */}
        <Section title="Color tokens">
          <div className="flex flex-wrap gap-[var(--ds-space-300)]">
            <TokenSwatch name="Primary (blue)" cssVar="--ds-color-background-accent-blue-bolder" />
            <TokenSwatch name="Success" cssVar="--ds-color-background-success-bold" />
            <TokenSwatch name="Warning" cssVar="--ds-color-background-warning-bold" />
            <TokenSwatch name="Danger" cssVar="--ds-color-background-danger-bold" />
            <TokenSwatch name="Discovery" cssVar="--ds-color-background-discovery-bold" />
            <TokenSwatch name="Surface raised" cssVar="--ds-elevation-surface-raised" />
            <TokenSwatch name="Surface sunken" cssVar="--ds-elevation-surface-sunken" />
            <TokenSwatch name="Border" cssVar="--ds-color-border" />
          </div>
        </Section>

        {/* ──────────────── BUTTON ──────────────── */}
        <Section title="Button">
          <Row label="Appearance">
            <Button appearance="default">Default</Button>
            <Button appearance="primary">Primary</Button>
            <Button appearance="subtle">Subtle</Button>
            <Button appearance="subtle-link">Subtle link</Button>
            <Button appearance="link">Link</Button>
            <Button appearance="warning">Warning</Button>
            <Button appearance="danger">Danger</Button>
            <Button appearance="discovery">Discovery</Button>
          </Row>
          <Row label="Spacing">
            <Button spacing="compact">Compact</Button>
            <Button spacing="default">Default</Button>
          </Row>
          <Row label="With icons">
            <Button appearance="primary" iconBefore={<Plus />}>
              Create project
            </Button>
            <Button iconAfter={<ChevronRight />}>Next</Button>
            <Button appearance="subtle" iconBefore={<Save />}>
              Save draft
            </Button>
          </Row>
          <Row label="States">
            <Button isLoading>Loading</Button>
            <Button isDisabled>Disabled</Button>
            <Button isSelected>Selected</Button>
            <Button appearance="primary" shouldFitContainer iconBefore={<Sparkles />}>
              Full-width primary
            </Button>
          </Row>
        </Section>

        {/* ──────────────── TEXT FIELD ──────────────── */}
        <Section title="TextField">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--ds-space-300)] max-w-[760px]">
            <Field label="Project name" name="project" isRequired helperText="Shown in the project list.">
              <TextField id="project" name="project" placeholder="e.g. Aurora" />
            </Field>
            <Field label="Search" name="search">
              <TextField
                id="search"
                placeholder="Search projects"
                elemBeforeInput={<Search size={14} />}
              />
            </Field>
            <Field label="Compact" name="compact">
              <TextField id="compact" isCompact placeholder="Compact field" />
            </Field>
            <Field label="Disabled" name="disabled">
              <TextField id="disabled" isDisabled defaultValue="Read-only value" />
            </Field>
            <Field label="Invalid" name="invalid" errorMessage="This field is required.">
              <TextField id="invalid" isInvalid defaultValue="" />
            </Field>
            <Field label="Subtle" name="subtle">
              <TextField id="subtle" appearance="subtle" placeholder="Subtle appearance" />
            </Field>
          </div>
        </Section>

        {/* ──────────────── SELECT ──────────────── */}
        <Section title="Select">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--ds-space-300)] max-w-[760px]">
            <Field label="Status" name="status">
              <Select
                id="status"
                value={selectVal}
                onChange={setSelectVal}
                placeholder="Choose a status…"
                options={[
                  { label: "To do", value: "todo" },
                  { label: "In progress", value: "wip" },
                  { label: "Blocked", value: "blocked", description: "needs attention" },
                  { label: "Done", value: "done" },
                ]}
              />
            </Field>
            <Field label="Compact" name="compactSel">
              <Select
                id="compactSel"
                isCompact
                placeholder="Compact select…"
                options={[
                  { label: "Low", value: "low" },
                  { label: "Medium", value: "med" },
                  { label: "High", value: "high" },
                ]}
              />
            </Field>
          </div>
        </Section>

        {/* ──────────────── CHECKBOX + RADIO ──────────────── */}
        <Section title="Checkbox &amp; RadioGroup">
          <Row label="Checkbox">
            <Checkbox label="Default" />
            <Checkbox label="Checked" defaultChecked />
            <Checkbox label="Indeterminate" isIndeterminate />
            <Checkbox label="Disabled" isDisabled />
            <Checkbox label="Invalid" isInvalid description="Something's off." />
            <Checkbox
              label="I agree to the terms"
              isChecked={agree}
              onChange={setAgree}
            />
          </Row>
          <Row label="RadioGroup">
            <div className="max-w-[340px]">
              <RadioGroup
                value={radio}
                onChange={setRadio}
                options={[
                  { label: "Daily", value: "daily", description: "Every morning at 9am." },
                  { label: "Weekly", value: "weekly", description: "Mondays." },
                  { label: "Monthly", value: "monthly" },
                  { label: "Never", value: "never", isDisabled: true },
                ]}
              />
            </div>
          </Row>
        </Section>

        {/* ──────────────── SECTION MESSAGE ──────────────── */}
        <Section title="SectionMessage (banners)">
          <div className="flex flex-col gap-[var(--ds-space-200)] max-w-[760px]">
            <SectionMessage appearance="information" title="Heads up">
              Atlassian's design tokens were last refreshed on Apr 11.
            </SectionMessage>
            <SectionMessage appearance="success" title="Deployed successfully">
              Build 4423 is live in production.
            </SectionMessage>
            <SectionMessage
              appearance="warning"
              title="Unsaved changes"
              actions={
                <>
                  <Button appearance="primary" spacing="compact" iconBefore={<Save />}>
                    Save
                  </Button>
                  <Button appearance="subtle" spacing="compact">
                    Discard
                  </Button>
                </>
              }
            >
              You have unsaved work. Save before leaving this page.
            </SectionMessage>
            <SectionMessage
              appearance="error"
              title="Upload failed"
              actions={
                <Button appearance="danger" spacing="compact" iconBefore={<Trash2 />}>
                  Remove file
                </Button>
              }
            >
              The file exceeded the 25&nbsp;MB limit.
            </SectionMessage>
            <SectionMessage appearance="discovery" title="New in April">
              Project templates are now available for all plans.
            </SectionMessage>
            <SectionMessage appearance="change" title="API change">
              Endpoints under <code>/v1/projects</code> will be removed on May&nbsp;30.
            </SectionMessage>
          </div>
        </Section>

        {/* ──────────────── MODAL ──────────────── */}
        <Section title="Modal">
          <Row label="Open">
            <Button appearance="primary" onClick={() => setModalOpen(true)}>
              Open modal
            </Button>
          </Row>
          <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} width="medium">
            <ModalHeader onClose={() => setModalOpen(false)}>
              <ModalTitle>Delete project “Aurora”?</ModalTitle>
              <ModalDescription>
                This action can't be undone. All associated tasks, files and comments will be
                permanently removed.
              </ModalDescription>
            </ModalHeader>
            <ModalBody>
              <Field
                label="Type the project name to confirm"
                name="confirm"
                helperText="Required to continue."
              >
                <TextField placeholder="Aurora" />
              </Field>
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button appearance="danger" iconBefore={<Trash2 />} onClick={() => setModalOpen(false)}>
                Delete project
              </Button>
            </ModalFooter>
          </Modal>
        </Section>

        {/* ──────────────── TABS ──────────────── */}
        <Section title="Tabs">
          <Row label="Composable">
            <div className="w-full max-w-[760px]">
              <Tabs selected={tab} onChange={setTab}>
                <TabList>
                  <Tab>Overview</Tab>
                  <Tab>Activity</Tab>
                  <Tab>Settings</Tab>
                  <Tab isDisabled>Integrations</Tab>
                </TabList>
                <TabPanel>
                  <p>Overview content — summary of this project.</p>
                </TabPanel>
                <TabPanel>
                  <p>Activity feed — recent events.</p>
                </TabPanel>
                <TabPanel>
                  <p>Settings — project configuration.</p>
                </TabPanel>
                <TabPanel>
                  <p>Integrations (disabled in this demo).</p>
                </TabPanel>
              </Tabs>
            </div>
          </Row>
          <Row label="Array API (TabsWithPanels)">
            <div className="w-full max-w-[760px]">
              <TabsWithPanels
                list={[{ label: "A" }, { label: "B" }, { label: "C" }]}
                panels={[
                  <p key="a">Panel A.</p>,
                  <p key="b">Panel B.</p>,
                  <p key="c">Panel C.</p>,
                ]}
              />
            </div>
          </Row>
        </Section>

        <footer className="py-[var(--ds-space-400)] text-[length:var(--ds-font-size-100)] text-[var(--ds-color-text-subtlest)]">
          All components render against the same Catalyst theme context — toggle light / dark and
          they respond automatically.
        </footer>
      </div>
    </div>
  );
}
