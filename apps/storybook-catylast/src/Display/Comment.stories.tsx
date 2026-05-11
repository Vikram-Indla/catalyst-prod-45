import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  Comment,
} from "@catylast/primitives";
import { color, fontFamily, space } from "@catylast/tokens";
import { useState } from "react";

const componentDescription = `**Comment** is the conversation primitive across Catylast — issue threads, document comments, code-review notes, audit-log entries with prose explanations. It pairs an avatar, an author name, an optional role tag, a timestamp, the comment body, an actions row, and an optional restriction marker, plus indented children for nested replies.

Built around composition: every visual region is a slot accepting any React node, so consumers can swap in router-aware author links, rich-text bodies, custom badges, time-ago tooltips, or whatever the surrounding surface needs. The component owns layout, typography, and the conversational visual feel; the *content* of each slot is yours.

Every styling dimension is exposed as both an enum prop and a CSS variable (\`--comment-bg\`, \`--comment-padding\`, \`--comment-accent-color\`, \`--comment-nested-indent\`, …) so consumers can override per-instance via \`style\` without touching the prop API.`;

const meta: Meta<typeof Comment> = {
  title: "Display/Comment",
  component: Comment,
  parameters: {
    layout: "padded",
    docs: { description: { component: componentDescription } },
  },
  argTypes: {
    size: { control: "inline-radio", options: ["small", "medium", "large"] },
    highlighted: { control: "boolean" },
    isSaving: { control: "boolean" },
  },
};
export default meta;

type Story = StoryObj<typeof Comment>;

const linkBtn = (label: string) => (
  <Button appearance="subtle-link" size="small" spacing="none">
    {label}
  </Button>
);

const Time = ({ children }: { children: React.ReactNode }) => (
  <a
    href="#"
    style={{
      color: color.text.subtle,
      textDecoration: "none",
      fontSize: "12px",
      fontFamily: fontFamily.sans,
    }}
    onClick={(e) => e.preventDefault()}
  >
    {children}
  </a>
);

const wrapStyle: React.CSSProperties = {
  width: "640px",
  fontFamily: fontFamily.sans,
};

// ---------- stories ----------

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The simplest comment — author + content. Every other slot is optional, so the surface scales from one-line replies up to full conversational threads with avatars, role tags, restriction markers, and nested replies.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <Comment
        author="Wasim Khan"
        content="Looks good to me — happy to merge once tests pass."
      />
    </div>
  ),
};

export const WithAvatarAndTime: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Pair the comment with the design-system `<Avatar>` for visual identity, and pass any node into `time` (typically a relative timestamp linking to the permalink).",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <Comment
        avatar={<Avatar name="Maya Patel" size="md" />}
        author="Maya Patel"
        time={<Time>2 hours ago</Time>}
        content={
          <p>
            I tested the calendar in a few non-Latin locales — the weekday
            narrowing handles Arabic and Japanese correctly, but
            right-to-left needs an explicit `dir="rtl"` wrapper. Should we
            wire that into the component?
          </p>
        }
        actions={[linkBtn("Reply"), linkBtn("React"), linkBtn("Edit")]}
      />
    </div>
  ),
};

export const WithRoleTag: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The `type` slot adds a small role tag right after the author name — perfect for surfacing context like *Author*, *OP*, *Moderator*, *Customer*. Pass a string for the default styling, or any node for full control.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <Comment
        avatar={<Avatar name="Wasim Khan" size="md" />}
        author="Wasim Khan"
        type="Author"
        time={<Time>just now</Time>}
        content="Pushed a fix for the slash-menu race condition. Re-running CI."
        actions={[linkBtn("Reply"), linkBtn("Edit"), linkBtn("Delete")]}
      />
    </div>
  ),
};

export const Restricted: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`restrictedTo` renders a lock icon and the supplied label, signalling the comment is only visible to a specific audience (a team, a role, an internal-only group). Use the warning text color so the restriction reads as an advisory rather than an error.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <Comment
        avatar={<Avatar name="Sarah Lee" size="md" />}
        author="Sarah Lee"
        restrictedTo="Engineering only"
        time={<Time>5 minutes ago</Time>}
        content="Internal note: the rollout strategy needs sign-off from infra before we merge. Ping me once the load test on staging is green."
        actions={[linkBtn("Reply"), linkBtn("Edit")]}
      />
    </div>
  ),
};

export const Highlighted: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Set `highlighted` to draw an accent border on the leading edge and tint the background. Useful when the comment was *just posted*, *mentions the current user*, or *is the focus of a deep link*.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <Comment
        avatar={<Avatar name="Jordan Reyes" size="md" />}
        author="Jordan Reyes"
        time={<Time>just now</Time>}
        highlighted
        content={
          <p>
            @wasim — could you double-check the dark-mode tokens on the new
            checkbox states? The invalid + checked combo looks washed out
            on my OLED panel.
          </p>
        }
        actions={[linkBtn("Reply"), linkBtn("React")]}
      />
    </div>
  ),
};

export const Saving: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "While the comment is being persisted, set `isSaving`. The component shows an animated dot + label under the body and disables interaction so users can't double-submit. Override the copy via `savingText`.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <Comment
        avatar={<Avatar name="Priya Sharma" size="md" />}
        author="Priya Sharma"
        time={<Time>now</Time>}
        content="Updated the migration plan to include the rollback path."
        isSaving
        actions={[linkBtn("Reply")]}
      />
    </div>
  ),
};

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Three sizes scale the body type and inner padding together. `small` for dense feed surfaces, `medium` (default) for issue threads, `large` for hero document discussions.",
      },
    },
  },
  render: () => (
    <div
      style={{
        ...wrapStyle,
        display: "flex",
        flexDirection: "column",
        gap: space[16],
      }}
    >
      {(["small", "medium", "large"] as const).map((s) => (
        <Comment
          key={s}
          size={s}
          avatar={<Avatar name="Tom Williams" size={s === "large" ? "lg" : "md"} />}
          author="Tom Williams"
          type={s}
          time={<Time>2h ago</Time>}
          content="Same prose, three sizes — note the type and padding scale."
          actions={[linkBtn("Reply"), linkBtn("Edit")]}
        />
      ))}
    </div>
  ),
};

export const NestedReplies: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compose `<Comment>` instances inside another `<Comment>` to render a thread. The child block is indented and gets a hairline thread-guide on its leading edge (set via the `--comment-nested-border-color` CSS variable below).",
      },
    },
  },
  render: () => (
    <div
      style={
        {
          ...wrapStyle,
          ["--comment-nested-border-width" as string]: "1px",
          ["--comment-nested-border-color" as string]:
            "var(--catylast-color-border-subtle)",
          ["--comment-nested-indent" as string]: "20px",
        } as React.CSSProperties
      }
    >
      <Comment
        avatar={<Avatar name="Alex Doe" size="md" />}
        author="Alex Doe"
        time={<Time>3 hours ago</Time>}
        content="Should we lift the work-item card composition into its own package once we've used it on three surfaces?"
        actions={[linkBtn("Reply"), linkBtn("React")]}
      >
        <Comment
          avatar={<Avatar name="Maya Patel" size="md" />}
          author="Maya Patel"
          time={<Time>2 hours ago</Time>}
          content="Yes — but let's wait until the board view ships so we have all three layouts to compare. Otherwise we'll lock in shape based on backlog + sidebar only."
          actions={[linkBtn("Reply"), linkBtn("React")]}
        >
          <Comment
            avatar={<Avatar name="Wasim Khan" size="md" />}
            author="Wasim Khan"
            type="Author"
            time={<Time>1 hour ago</Time>}
            content="Agreed. I'll add a TODO in the architecture notes."
            actions={[linkBtn("Reply"), linkBtn("React")]}
          />
        </Comment>
        <Comment
          avatar={<Avatar name="Ben Cooper" size="md" />}
          author="Ben Cooper"
          time={<Time>1 hour ago</Time>}
          content="One concern: backlog rows render hundreds at a time. Whatever we lift into the new package needs to memoize aggressively."
          actions={[linkBtn("Reply"), linkBtn("React")]}
        />
      </Comment>
    </div>
  ),
};

export const ThreadComposition: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "How a real issue-thread surface looks — multiple top-level comments, one of them highlighted (deep-linked), one with a role tag, one restricted, one nested reply chain, one currently saving.",
      },
    },
  },
  render: () => (
    <div
      style={{
        ...wrapStyle,
        display: "flex",
        flexDirection: "column",
        gap: space[16],
        padding: space[24],
        background: color.surface.background,
      }}
    >
      <Comment
        avatar={<Avatar name="Wasim Khan" size="md" />}
        author="Wasim Khan"
        type="Author"
        time={<Time>2 days ago</Time>}
        content={
          <>
            <p style={{ margin: 0 }}>
              Reproducing on Chromium 124 — the slash menu sometimes
              freezes for ~300ms when the document has 50+ blocks. Profile
              attached.
            </p>
            <p
              style={{
                marginTop: space[8],
                marginBottom: 0,
                fontSize: "12px",
                color: color.text.subtle,
              }}
            >
              Repro steps:
            </p>
            <ol style={{ margin: 0, paddingInlineStart: "20px", fontSize: "13px" }}>
              <li>Open a document with 100+ blocks.</li>
              <li>Type / and immediately Backspace twice.</li>
              <li>Watch for the input lag.</li>
            </ol>
          </>
        }
        actions={[
          linkBtn("Reply"),
          linkBtn("Edit"),
          linkBtn("Delete"),
        ]}
      />
      <Comment
        avatar={<Avatar name="Maya Patel" size="md" />}
        author="Maya Patel"
        time={<Time>1 day ago</Time>}
        content="Confirmed on my machine. Looks like the prosemirror plugin re-runs across the whole doc when the slash menu opens. Worth a profile pass."
        actions={[linkBtn("Reply"), linkBtn("React")]}
      >
        <Comment
          avatar={<Avatar name="Wasim Khan" size="md" />}
          author="Wasim Khan"
          type="Author"
          time={<Time>1 day ago</Time>}
          content="Yeah — I think we can scope the plugin to the active node range only."
          actions={[linkBtn("Reply"), linkBtn("React")]}
        />
      </Comment>
      <Comment
        avatar={<Avatar name="Sarah Lee" size="md" />}
        author="Sarah Lee"
        restrictedTo="Engineering only"
        time={<Time>20 hours ago</Time>}
        content="Internal: the prod telemetry shows this fires for ~6% of sessions. Bumping to P1."
        actions={[linkBtn("Reply"), linkBtn("Edit")]}
      />
      <Comment
        avatar={<Avatar name="Jordan Reyes" size="md" />}
        author="Jordan Reyes"
        time={<Time>just now</Time>}
        highlighted
        content="@wasim — pushed branch fix/slash-menu-scope. Want to try it?"
        actions={[linkBtn("Reply"), linkBtn("React"), linkBtn("Edit")]}
      />
      <Comment
        avatar={<Avatar name="Priya Sharma" size="md" />}
        author="Priya Sharma"
        time={<Time>now</Time>}
        content="Tested the branch on the repro — fixed for me. Merging once CI is green."
        isSaving
        actions={[linkBtn("Reply")]}
      />
    </div>
  ),
};

export const CommentForm: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "How a `<Comment>` and a reply form sit next to each other on a real surface. The form below is *not* part of the Comment primitive — but the layout they share (avatar gutter, indented content column) reads coherently because both pieces follow the same gap / size scales.",
      },
    },
  },
  render: function CommentFormStory() {
    const [draft, setDraft] = useState("");
    const [restricted, setRestricted] = useState(false);
    const [comments, setComments] = useState<
      { id: number; author: string; content: string; restricted: boolean }[]
    >([
      {
        id: 1,
        author: "Maya Patel",
        content: "Should we update the docs to mention the new keyboard shortcut?",
        restricted: false,
      },
    ]);
    const submit = () => {
      if (!draft.trim()) return;
      setComments([
        ...comments,
        { id: Date.now(), author: "You", content: draft, restricted },
      ]);
      setDraft("");
      setRestricted(false);
    };
    return (
      <div
        style={{
          ...wrapStyle,
          display: "flex",
          flexDirection: "column",
          gap: space[12],
          padding: space[24],
          background: color.surface.background,
        }}
      >
        {comments.map((c) => (
          <Comment
            key={c.id}
            avatar={<Avatar name={c.author} size="md" />}
            author={c.author}
            time={<Time>just now</Time>}
            content={c.content}
            restrictedTo={c.restricted ? "Engineering only" : undefined}
            actions={[linkBtn("Reply"), linkBtn("React")]}
          />
        ))}
        <div
          style={{
            display: "flex",
            gap: space[12],
            paddingTop: space[12],
            borderTop: `1px solid ${color.border.subtle}`,
          }}
        >
          <Avatar name="You" size="md" />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: space[8],
              flex: 1,
            }}
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a comment…"
              rows={3}
              style={{
                width: "100%",
                padding: space[8],
                border: `1px solid ${color.border.default}`,
                borderRadius: "6px",
                fontFamily: fontFamily.sans,
                fontSize: "14px",
                resize: "vertical",
                outline: "none",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: space[8],
              }}
            >
              <Checkbox
                size="small"
                isChecked={restricted}
                onChange={setRestricted}
                label="Restrict to Engineering"
              />
              <span style={{ flex: 1 }} />
              <Button
                appearance="subtle"
                size="small"
                onClick={() => setDraft("")}
              >
                Cancel
              </Button>
              <Button
                appearance="primary"
                size="small"
                onClick={submit}
                isDisabled={!draft.trim()}
              >
                Post
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  },
};

export const CssVariableEscapeHatch: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Every prop maps to a CSS variable on the comment root. To go beyond the enum vocabulary — branded highlight colors, custom indentation, hairline thread guides, custom backgrounds — override the same variables directly via `style`.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <Comment
        avatar={<Avatar name="Sarah Lee" size="md" />}
        author="Sarah Lee"
        type={<Badge variant="primary">Reviewer</Badge>}
        time={<Time>1 hour ago</Time>}
        highlighted
        content="Branded highlight — purple accent, soft surface, larger nested indent."
        actions={[linkBtn("Reply"), linkBtn("React")]}
        style={
          {
            "--comment-bg-highlighted": "rgba(120, 80, 200, 0.06)",
            "--comment-accent-color-highlighted":
              "var(--catylast-color-purple-500)",
            "--comment-accent-width-highlighted": "4px",
            "--comment-padding": "16px",
            "--comment-radius": "12px",
          } as React.CSSProperties
        }
      >
        <Comment
          avatar={<Avatar name="Wasim Khan" size="md" />}
          author="Wasim Khan"
          time={<Time>40 minutes ago</Time>}
          content="Reply rendered inside a thread with a wider indent and a hairline guide on the leading edge."
          actions={[linkBtn("Reply"), linkBtn("React")]}
          style={
            {
              "--comment-nested-indent": "32px",
              "--comment-nested-border-width": "2px",
              "--comment-nested-border-color":
                "var(--catylast-color-purple-200)",
            } as React.CSSProperties
          }
        />
      </Comment>
    </div>
  ),
};
