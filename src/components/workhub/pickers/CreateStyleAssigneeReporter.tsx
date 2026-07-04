/**
 * CreateStyleAssigneeReporter — Assignee + Reporter picker components that
 * render EXACTLY like the Create Story modal's Assignee + Reporter fields:
 *
 *   - `@atlaskit/select` bordered field trigger (blue border on focus)
 *   - In-field search (react-select input)
 *   - Avatar + name option rendering via `formatIconOption`
 *   - "Automatic" pseudo-option at the top of the Assignee list
 *   - "Assign to me" link button below the Assignee field
 *   - Reporter is the same picker minus "Automatic" + minus "Assign to me"
 *
 * Used only by CloneIssueDialog. CreateStoryModal keeps its own inline
 * copy — this file is NOT imported there. The two live independently on
 * purpose so touching one never breaks the other.
 */
import React, { useMemo, type ReactNode } from 'react';
import Select from '@atlaskit/select';
import Button from '@atlaskit/button/new';
import { Box, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { useTeamMembers } from '@/components/workhub/create-story/useCreateStory';

export interface IconOption {
  value: string;
  label: string;
  icon?: ReactNode;
  sublabel?: string;
}

/** Row renderer for `<Select formatOptionLabel={formatIconOption}>`. Mirrors
 *  the exact renderer used in CreateStoryModal. */
export const formatIconOption = (option: IconOption) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: token('space.100'),
    }}
  >
    {option.icon}
    <span>{option.label}</span>
    {option.sublabel ? (
      <span
        style={{
          color: token('color.text.subtlest'),
          font: token('font.body.small'),
        }}
      >
        {option.sublabel}
      </span>
    ) : null}
  </span>
);

/** Canonical @atlaskit/avatar xsmall (24px). */
export function MiniAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  return <CatalystAvatar size="small" name={name} src={avatarUrl ?? undefined} />;
}

const assignToMeStyles = xcss({
  marginTop: 'space.075',
});

/** Build member options for the Assignee / Reporter selects. Same shape as
 *  CreateStoryModal's memberOptions. */
export function useMemberOptions(): IconOption[] {
  const { data: members = [] } = useTeamMembers();
  return useMemo(
    () =>
      members.map((m: any) => ({
        value: m.id,
        label: m.full_name ?? m.email ?? 'Unknown',
        icon: <MiniAvatar name={m.full_name ?? m.email ?? '?'} avatarUrl={m.avatar_url ?? null} />,
      })),
    [members],
  );
}

// ─── Assignee field ────────────────────────────────────────────────
const AUTOMATIC_VALUE = '__AUTOMATIC__';

export interface AssigneeFieldProps {
  /** Currently selected assignee id, or null for "Automatic". */
  value: string | null;
  onChange: (userId: string | null) => void;
  /** Current viewer id — enables the "Assign to me" link. */
  currentUserId?: string | null;
  inputId?: string;
}

export function CreateStyleAssigneeSelect({
  value,
  onChange,
  currentUserId,
  inputId = 'cs-assignee',
}: AssigneeFieldProps) {
  const memberOptions = useMemberOptions();

  const automaticOption: IconOption = {
    value: AUTOMATIC_VALUE,
    label: 'Automatic',
    icon: <MiniAvatar name="?" />,
  };

  const selectedOption =
    value
      ? memberOptions.find((o) => o.value === value) ?? null
      : automaticOption;

  return (
    <>
      <Select<IconOption>
        inputId={inputId}
        options={[automaticOption, ...memberOptions]}
        value={selectedOption}
        onChange={(opt) => {
          const v = (opt as IconOption)?.value;
          onChange(!v || v === AUTOMATIC_VALUE ? null : v);
        }}
        formatOptionLabel={formatIconOption}
        isClearable
        placeholder="Automatic"
        /* Portal + fixed position so the menu renders above the modal footer
           / any lower z-index sibling. Matches CreateStoryModal parity. */
        menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
        menuPosition="fixed"
        styles={{ menuPortal: (base: any) => ({ ...base, zIndex: 9999 }) }}
      />
      <Box xcss={assignToMeStyles}>
        <Button
          appearance="link"
          spacing="compact"
          onClick={() => {
            if (currentUserId) onChange(currentUserId);
          }}
        >
          Assign to me
        </Button>
      </Box>
    </>
  );
}

// ─── Reporter field ────────────────────────────────────────────────
export interface ReporterFieldProps {
  value: string | null;
  onChange: (userId: string | null) => void;
  inputId?: string;
  isRequired?: boolean;
  isInvalid?: boolean;
}

export function CreateStyleReporterSelect({
  value,
  onChange,
  inputId = 'cs-reporter',
  isRequired,
  isInvalid,
}: ReporterFieldProps) {
  const memberOptions = useMemberOptions();

  const reporterOption = memberOptions.find((o) => o.value === value) ?? null;

  return (
    <Select<IconOption>
      inputId={inputId}
      isRequired={isRequired}
      isInvalid={isInvalid}
      options={memberOptions}
      value={reporterOption}
      onChange={(opt) => onChange((opt as IconOption)?.value ?? null)}
      formatOptionLabel={formatIconOption}
      placeholder="Select reporter"
      menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
      menuPosition="fixed"
      styles={{ menuPortal: (base: any) => ({ ...base, zIndex: 9999 }) }}
    />
  );
}
