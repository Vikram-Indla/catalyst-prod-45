CC TASK BRIEF — Chevron tooltip shortcut hint

File:   src/components/ja/CatalystHeader.tsx
Change: Enhance the sidebar-toggle IconButton tooltip to include the
        keyboard shortcut chip (matches Jira's "Expand sidebar" + `Ctrl [`).
Reason: Jira's chevron tooltip shows the shortcut as a small chip under
        the label; Catalyst's tooltip shows only the text label. Adding
        the shortcut chip matches Jira parity and surfaces the existing
        `[` keybinding that already lives in CatalystContext.
        Audit row: P2-1 in
        .catalyst/audits/jira-compare/2026-04-21-chevron-hover-flyout.md
Spec:   https://atlassian.design/components/tooltip

Current code (around lines 120-125):
  <IconButton
    label={isCollapsed ? 'Expand sidebar' : 'Hide sidebar'}
    appearance="subtle"
    onClick={cycleSidebarState}
    icon={isCollapsed ? SidebarExpandIcon : SidebarCollapseIcon}
  />

Target: wrap the IconButton in an @atlaskit/tooltip whose `content`
prop renders the label + shortcut chip together, matching Jira's
structure. The existing `label` prop on IconButton remains for a11y
(aria-label), while the custom tooltip renders the visual chip.

Sketch (verify exact prop shape against @atlaskit/tooltip docs):
  <Tooltip
    content={
      <Stack space="space.050" alignInline="center">
        <Text>{isCollapsed ? 'Expand sidebar' : 'Hide sidebar'}</Text>
        <Kbd>⌘ [</Kbd>  // or platform-aware variant
      </Stack>
    }
    position="bottom"
  >
    <IconButton
      label={isCollapsed ? 'Expand sidebar' : 'Hide sidebar'}
      appearance="subtle"
      onClick={cycleSidebarState}
      icon={isCollapsed ? SidebarExpandIcon : SidebarCollapseIcon}
    />
  </Tooltip>

Also align the actual keyboard binding to match Jira — currently the
shortcut in CatalystContext is `[` alone. Jira binds `Ctrl/Cmd + [`.
Update the binding to require the platform modifier for consistency
(safer default — bare `[` collides with typing `[` into any text field).

Acceptance:
  - [ ] Only src/components/ja/CatalystHeader.tsx and
        src/contexts/CatalystContext.tsx changed.
  - [ ] Tooltip renders label + keyboard chip (visually matches Jira).
  - [ ] Tooltip uses @atlaskit/tooltip — no custom tooltip primitive.
  - [ ] Chip uses platform-appropriate modifier (⌘ on macOS, Ctrl
        elsewhere). Use the existing platform detection utility if
        Catalyst has one; otherwise infer from navigator.platform.
  - [ ] Shortcut `Cmd + [` (macOS) / `Ctrl + [` (other) toggles sidebar.
        Bare `[` no longer toggles.
  - [ ] aria-label on IconButton still reads as "Expand sidebar" /
        "Hide sidebar" (unchanged — screen readers don't read the chip).
  - [ ] No new @atlaskit/* package needed (tooltip already in
        package.json — verify).
  - [ ] TypeScript clean.

Do NOT touch:
  - src/components/layout/AppSwitcher.tsx (deletion handled in P1-2 brief)
  - Any file outside the two listed.
