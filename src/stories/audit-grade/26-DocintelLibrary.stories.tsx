import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { AuthContext, type AuthContextType } from "@/lib/auth";
import DocintelLibraryPage from "@/modules/docintel/pages/DocintelLibraryPage";
import type { DocintelDocument } from "@/modules/docintel/types";

const project = { id: "project-1", key: "BAU", name: "BAU transformation" };
const userId = "library-story-user";

const authValue: AuthContextType = {
  user: { id: userId } as User,
  session: null,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => undefined,
  sendOtp: async () => ({ error: null }),
  verifyOtp: async () => ({ error: null }),
  loading: false,
  isAuthenticated: true,
};

function source(overrides: Partial<DocintelDocument>): DocintelDocument {
  return {
    id: "document-1",
    project_id: project.id,
    slug: "industrial-scanning-brd",
    title: "Industrial Scanning BRD",
    source_type: "document",
    original_file_name: "industrial-scanning-brd.pdf",
    mime_type: "application/pdf",
    storage_path: "project-1/industrial-scanning-brd.pdf",
    file_size: 428_000,
    page_count: 24,
    source_language: "en",
    status: "ready",
    status_detail: null,
    latency_ms: null,
    content_hash: null,
    error_message: null,
    created_by: null,
    created_at: "2026-07-10T08:00:00.000Z",
    updated_at: "2026-07-11T10:00:00.000Z",
    ...overrides,
  };
}

const sources: DocintelDocument[] = [
  source({ id: "document" }),
  source({
    id: "jira",
    slug: "bau-6122-spare-part-exemption",
    title: "BAU-6122 — Implement spare part exemptions",
    source_type: "jira",
    original_file_name: "",
    mime_type: "",
    storage_path: "",
    page_count: null,
    status: "needs_review",
  }),
  source({
    id: "git",
    slug: "docs-slug-contract-md",
    title: "docs/slug-contract.md",
    source_type: "git",
    original_file_name: "",
    mime_type: "",
    storage_path: "",
    page_count: null,
    status: "queued",
  }),
  source({
    id: "arabic",
    slug: "raw-materials-brd-ar",
    title: "وثيقة متطلبات الأعمال — عرض وطلب المواد الخام",
    source_type: "document",
    source_language: "ar",
    status: "failed",
  }),
];

function LibraryStory() {
  const [client] = useState(() => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity, refetchOnMount: false, refetchOnWindowFocus: false },
      },
    });
    queryClient.setQueryData(["docintel", "projects", userId], [project]);
    queryClient.setQueryData(["docintel", "list", project.id], sources);
    queryClient.setQueryData(["docintel", "themes", project.id], []);
    return queryClient;
  });

  return (
    <AuthContext.Provider value={authValue}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/doc-intelligence/views/library"]}>
          <DocintelLibraryPage />
        </MemoryRouter>
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}

const meta = {
  title: "Audit Grade/26 — Doc Intel Library",
  component: DocintelLibraryPage,
  parameters: { layout: "padded" },
} satisfies Meta<typeof DocintelLibraryPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MixedSources: Story = {
  render: () => <LibraryStory />,
};
