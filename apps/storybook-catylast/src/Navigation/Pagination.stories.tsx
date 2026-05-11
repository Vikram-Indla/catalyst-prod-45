import type { Meta, StoryObj } from "@storybook/react-vite";
import { Pagination } from "@catylast/primitives";
import { color, fontFamily, space, typography } from "@catylast/tokens";
import { useState } from "react";

const meta: Meta<typeof Pagination> = {
  title: "Navigation/Pagination",
  component: Pagination,
  parameters: {
    docs: {
      description: {
        component:
          "Page navigation for paginated lists — tables, comment threads, archived issue lists, audit logs, search results. Built as a standalone primitive so any surface that paginates a collection can reuse it. The same component is composed inside `DynamicTable`'s footer.\n\n- **Controlled or uncontrolled.** Omit `page` for uncontrolled mode where the component manages its own state. Pass `page` + `onPageChange` to drive it from the outside — useful for URL-synced pagination.\n- **Smart windowing.** When `pageCount` is large, only the boundary pages (`boundaryCount`) and pages around the current position (`siblingCount`) are rendered. The gaps render as `…` ellipses.\n- **Accessible by default.** Renders as a `<nav aria-label=\"Pagination\">` with `aria-current=\"page\"` on the active button, proper `aria-label`s on prev/next, and visible focus ring on tab.\n- **CSS-var escape hatch.** Every dimension (size, gap, active background, border) is exposed as a `--pagination-*` CSS variable per the design-system customization rule.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Pagination>;

const wrap = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "flex-start" as const,
  gap: space[16],
  padding: space[24],
  fontFamily: fontFamily.sans,
  color: color.text.primary,
};

const label = {
  fontSize: typography.body.small.fontSize,
  color: color.text.subtle,
};

// ---------- focused stories ----------

export const Basic: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Uncontrolled — the component tracks its own current page. Start on page 1, click any number to jump, click the chevrons to step.",
      },
    },
  },
  render: () => (
    <div style={wrap}>
      <span style={label}>5 pages — no windowing yet</span>
      <Pagination pageCount={5} />
    </div>
  ),
};

export const ManyPagesWithEllipses: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "With `pageCount={20}`, only the boundary pages (1, 20) and a window around the current page render — the rest collapse into `…` ellipses. Click `1` then any middle page to see the window slide.",
      },
    },
  },
  render: function ManyPagesStory() {
    const [page, setPage] = useState(7);
    return (
      <div style={wrap}>
        <span style={label}>
          20 pages — page {page} of 20 (controlled)
        </span>
        <Pagination pageCount={20} page={page} onPageChange={setPage} />
      </div>
    );
  },
};

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story: "Three size scales — `small` (24px), `medium` (28px, default), and `large` (36px).",
      },
    },
  },
  render: () => (
    <div style={wrap}>
      <span style={label}>small</span>
      <Pagination pageCount={5} size="small" />
      <span style={label}>medium (default)</span>
      <Pagination pageCount={5} size="medium" />
      <span style={label}>large</span>
      <Pagination pageCount={5} size="large" />
    </div>
  ),
};

export const DisabledAtEdges: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The prev / next chevrons disable themselves when the user is at the first or last page. Try jumping to page 1 (prev disables) and to the last page (next disables).",
      },
    },
  },
  render: function EdgesStory() {
    const [page, setPage] = useState(1);
    return (
      <div style={wrap}>
        <span style={label}>page {page} of 8</span>
        <Pagination pageCount={8} page={page} onPageChange={setPage} />
      </div>
    );
  },
};

export const HideOnSinglePage: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "When `hideOnSinglePage` is on and there's only one page, the component renders nothing. Useful for paginated lists that may have fewer items than a page — the chrome silently disappears instead of rendering a useless `1` button.",
      },
    },
  },
  render: () => (
    <div style={wrap}>
      <span style={label}>pageCount=1, hideOnSinglePage on — nothing renders</span>
      <Pagination pageCount={1} hideOnSinglePage />
      <span style={label}>pageCount=1, hideOnSinglePage off — chrome stays</span>
      <Pagination pageCount={1} />
    </div>
  ),
};

export const CustomBoundaryAndSibling: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Increase `siblingCount` and `boundaryCount` to show more pages at the boundaries / around the current page before ellipses appear. Useful for wide layouts where the extra room is available.",
      },
    },
  },
  render: function CustomStory() {
    const [page, setPage] = useState(10);
    return (
      <div style={wrap}>
        <span style={label}>
          page {page} of 20 · siblingCount=2 · boundaryCount=2
        </span>
        <Pagination
          pageCount={20}
          page={page}
          onPageChange={setPage}
          siblingCount={2}
          boundaryCount={2}
        />
      </div>
    );
  },
};
