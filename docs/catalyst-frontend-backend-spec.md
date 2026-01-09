# Catalyst Architecture & Integration Specification

> **Purpose**: Complete specification for Claude to generate new modules with full UI + backend integration

---

## Table of Contents
1. [Side Panel Structure](#1-side-panel-structure)
2. [Top Navigation Structure](#2-top-navigation-structure)
3. [Design Token System](#3-design-token-system)
4. [AI Integration Pattern](#4-ai-integration-pattern)
5. [Database Schema Patterns](#5-database-schema-patterns)

---

## 1. Side Panel Structure

### Core Component: `SidebarBase`

All non-admin sidebars use the shared `SidebarBase` component located at:
```
src/components/layout/SidebarBase.tsx
```

### Sidebar Configuration Interface

```typescript
export interface SidebarMenuItem {
  id: string;
  title: string;
  path: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  exact?: boolean;
  /** Optional badge count to display */
  badge?: number;
}

export interface SidebarConfig {
  /** Badge text shown in the header (e.g., "PR", "EN", "RL", "TM") */
  badge: string;
  /** Section label shown when expanded (e.g., "Product", "Enterprise") */
  label: string;
  /** Menu items to display */
  items: SidebarMenuItem[];
  /** Footer item (e.g., Settings) - optional */
  footerItem?: SidebarMenuItem;
}

interface SidebarBaseProps {
  config: SidebarConfig;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
  /** Custom icon resolver for menu items */
  iconResolver?: (itemId: string) => React.ComponentType<{ className?: string }> | undefined;
}
```

### Example Sidebar Implementation

```typescript
// Example: TestManagementSidebar.tsx
import { 
  Home, FileText, RefreshCw, Bug, BarChart3, Settings,
  LayoutDashboard, Layers, Play, Target, GitBranch,
} from 'lucide-react';
import { SidebarBase, SidebarConfig } from './SidebarBase';

interface TestManagementSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const testManagementSidebarConfig: SidebarConfig = {
  badge: 'TM',           // 2-letter module badge
  label: 'Test Management',
  items: [
    { id: 'command-center', title: 'Command Center', path: '/tests/command-center', icon: LayoutDashboard, exact: true },
    { id: 'my-work', title: 'My Work', path: '/tests/my-work', icon: Home, exact: true },
    { id: 'cases', title: 'Test Cases', path: '/tests/cases', icon: FileText, exact: false },
    { id: 'sets', title: 'Test Sets', path: '/tests/sets', icon: Layers, exact: false },
    { id: 'cycles', title: 'Test Cycles', path: '/tests/cycles', icon: RefreshCw, exact: false },
    { id: 'execution', title: 'Test Execution', path: '/tests/execution', icon: Play, exact: false },
    { id: 'defects', title: 'Defects', path: '/tests/defects', icon: Bug, exact: false },
    { id: 'requirements', title: 'Requirements', path: '/tests/requirements', icon: Target, exact: false },
    { id: 'traceability', title: 'Traceability', path: '/tests/traceability', icon: GitBranch, exact: false },
    { id: 'reports', title: 'Reports', path: '/tests/reports', icon: BarChart3, exact: false },
  ],
  footerItem: {
    id: 'settings',
    title: 'Settings',
    path: '/tests/settings',
    icon: Settings,
    exact: true,
  },
};

export function TestManagementSidebar({ expanded, onToggle, className }: TestManagementSidebarProps) {
  return (
    <SidebarBase
      config={testManagementSidebarConfig}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
```

### Sidebar Visual Specifications

| Property | Collapsed | Expanded |
|----------|-----------|----------|
| Width | 60px | 220px |
| Header Height | 52px | 52px |
| Item Height | 44px | 44px |
| Icon Size | 18px | 18px |
| Font Size | - | 13px |
| Active Indicator | 3px left bar (blue) | 3px left bar (blue) |
| Background | `var(--surface-elevated)` | `var(--surface-elevated)` |
| Border | `1px solid var(--divider)` | `1px solid var(--divider)` |

### Key CSS Variables Used

```css
--surface-elevated: /* Card/elevated surface */
--surface-1: /* Page background */
--divider: /* Border color */
--card-shadow: /* Subtle shadow */
--icon-default: /* Icon color */
--nav-active-bg: /* Active item background */
--nav-hover-bg: /* Hover state */
--brand-primary: /* Blue accent #2563eb */
--foreground: /* Text color */
```

---

## 2. Top Navigation Structure

### Core Component: `CatalystHeader`

Located at: `src/components/ja/CatalystHeader.tsx`

### Top Nav Specifications

| Property | Value |
|----------|-------|
| Height | 56px (fixed) |
| Z-Index | 100 |
| Position | sticky top-0 |
| Background | `var(--nav-bg)` |
| Border Bottom | `1px solid var(--divider)` |
| Shadow | `0 1px 3px 0 rgba(0,0,0,0.05)` |
| Padding | 0 16px |

### Navigation Item Structure

```typescript
const navItems = [
  { label: "Home", path: "/for-you", moduleCode: null },
  { label: "Enterprise", path: "/enterprise/strategy-room", moduleCode: "ENTERPRISE", requiresEnterpriseAccess: true },
  { label: "Product", hasDropdown: true, moduleCode: "PRODUCT" },
  { label: "Program", hasDropdown: true, moduleCode: "PORTFOLIO" },
  { label: "Project", hasDropdown: true, moduleCode: "PROGRAM" },
  { label: "Tests", path: "/tests", moduleCode: null },
  { label: "Operations", hasDropdown: true, path: "/release", moduleCode: null },
  { label: "Planner", hasDropdown: true, path: "/planner", moduleCode: null },
];
```

### Nav Item Styles

```typescript
const navButtonStyle: React.CSSProperties = {
  height: '36px',
  padding: '0 14px',
  fontSize: '14px',
  fontWeight: isActive ? 600 : 500,
  color: isActive ? 'hsl(var(--primary))' : 'var(--nav-text)',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  cursor: 'pointer',
  transition: 'background 0.15s ease, color 0.15s ease',
  border: 'none',
  background: isActive ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
};
```

### Header Zones (Left to Right)

1. **Logo Zone** - "Cata" (foreground) + "lyst" (brand-gold)
2. **Navigation Zone** - Primary nav items with dropdowns
3. **Actions Zone** - Search, Create, Notifications, User Menu, Theme Toggle

---

## 3. Design Token System

### CATALYST V5 — Blue + Teal Professional Palette

#### Brand Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--brand-primary` | `217 91% 53%` (#2563eb) | `217 91% 60%` | Primary actions, links |
| `--brand-teal` | `173 58% 39%` (#0d9488) | `173 58% 39%` | Success states |
| `--brand-gold` | `34 40% 60%` | `#C69C6D` | Accent, logo |

#### Semantic State Colors

| State | Token | Light | Dark |
|-------|-------|-------|------|
| Success | `--success-fg` | #0d9488 | #2dd4bf |
| Warning | `--warning-fg` | #d97706 | #fbbf24 |
| Danger | `--danger-fg` | #dc2626 | #f87171 |
| Info | `--info-fg` | #2563eb | #60a5fa |

#### Surface Ladder (Light Mode)

```css
--surface-0: 0 0% 100%;     /* #ffffff - cards, dialogs */
--surface-1: 0 0% 98%;      /* #fafafa - page background */
--surface-2: 0 0% 97%;      /* #f8f8f7 - subtle sections */
--surface-3: 0 0% 95%;      /* #f3f3f3 - muted containers */
--surface-elevated: 0 0% 100%;
```

#### Surface Ladder (Dark Mode)

```css
--bg-0: #0F1113;            /* App background */
--bg-1: #141619;            /* Page canvas */
--bg-2: #181B1F;            /* Panels */
--bg-3: #1D2126;            /* Cards */
--bg-4: #232830;            /* Raised/hover */
--bg-5: #2A313A;            /* Active/selected */
```

#### Text Ladder

| Level | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--fg-1` | rgba(0,0,0,0.92) | rgba(255,255,255,0.92) | Primary text |
| `--fg-2` | rgba(0,0,0,0.72) | rgba(255,255,255,0.72) | Secondary text |
| `--fg-3` | rgba(0,0,0,0.55) | rgba(255,255,255,0.55) | Muted/hints |
| `--fg-4` | rgba(0,0,0,0.38) | rgba(255,255,255,0.38) | Disabled |

#### Border & Divider Tokens

```css
/* Light Mode */
--divider: rgba(0, 0, 0, 0.08);
--border-subtle: 0 0% 91%;
--border-default: 0 0% 88%;
--border-strong: 0 0% 78%;

/* Dark Mode */
--divider: rgba(255,255,255,0.06);
--border-subtle: rgba(255,255,255,0.08);
--border-strong: rgba(255,255,255,0.12);
```

#### Interaction States

```css
/* Light Mode */
--nav-hover-bg: rgba(0, 0, 0, 0.03);
--nav-active-bg: rgba(37, 99, 235, 0.1);
--row-hover: rgba(0, 0, 0, 0.04);
--row-selected: rgba(37, 99, 235, 0.08);

/* Dark Mode */
--hover: rgba(255,255,255,0.04);
--active: rgba(255,255,255,0.07);
--selected: rgba(255,255,255,0.08);
--nav-active-bg: rgba(59, 130, 246, 0.12);
```

#### Typography

```css
fontFamily: {
  sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
  mono: ["SF Mono", "Monaco", "Consolas", "monospace"],
}

fontSize: {
  "2xs": "0.6875rem",   /* 11px */
  xs: "0.75rem",        /* 12px */
  sm: "0.8125rem",      /* 13px */
  base: "0.875rem",     /* 14px */
  md: "0.9375rem",      /* 15px */
  lg: "1rem",           /* 16px */
  xl: "1.125rem",       /* 18px */
}
```

#### Chart Palette

```css
--chart-passed: #0d9488;   /* Teal - success */
--chart-failed: #ef4444;   /* Red - danger */
--chart-blocked: #d97706;  /* Orange - warning */
--chart-active: #2563eb;   /* Blue - in-progress */
```

### Tailwind Usage

```tsx
// ✅ CORRECT - Use semantic tokens
<div className="bg-surface-1 text-foreground border-divider">
<Button className="bg-brand-primary hover:bg-brand-primary-hover">

// ❌ WRONG - Never use raw colors
<div className="bg-white text-black border-gray-200">
<Button className="bg-blue-600 hover:bg-blue-700">
```

---

## 4. AI Integration Pattern

### Lovable AI Gateway

All AI functionality uses the Lovable AI Gateway at:
```
https://ai.gateway.lovable.dev/v1/chat/completions
```

### Available Models

| Model | Use Case |
|-------|----------|
| `google/gemini-2.5-flash` | **Default** - Balanced speed & quality |
| `google/gemini-2.5-pro` | Complex reasoning, large context |
| `google/gemini-2.5-flash-lite` | Fast, simple tasks |
| `openai/gpt-5` | High accuracy, nuanced tasks |
| `openai/gpt-5-mini` | Good balance for most tasks |

### Edge Function Template

```typescript
// supabase/functions/ai-{feature}/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { /* request params */ } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing AI request...");

    const systemPrompt = `You are a domain expert...`;
    
    const userPrompt = `Based on the following data:
${JSON.stringify(data, null, 2)}

Provide analysis...`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        // For structured output, use tool calling:
        tools: [
          {
            type: "function",
            function: {
              name: "provide_analysis",
              description: "Return structured analysis",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
                        confidence_score: { type: "number", minimum: 0, maximum: 1 },
                      },
                      required: ["title", "description", "priority"],
                    },
                  },
                },
                required: ["recommendations"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_analysis" } },
      }),
    });

    // Handle rate limits and payment errors
    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices[0].message.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log("Generated", result.recommendations?.length || 0, "recommendations");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### Frontend Integration

```typescript
// hooks/useAIFeature.ts
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export function useAIFeature() {
  return useMutation({
    mutationFn: async (params: { data: any }) => {
      const { data, error } = await supabase.functions.invoke('ai-feature', {
        body: params
      });
      
      if (error) throw error;
      return data;
    },
    onError: (error: any) => {
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        toast.error('Rate limit exceeded. Please try again in a moment.');
      } else if (error.message?.includes('402') || error.message?.includes('Payment')) {
        toast.error('AI credits exhausted. Please add funds to continue.');
      } else {
        toast.error('AI analysis failed. Please try again.');
      }
    },
  });
}
```

---

## 5. Database Schema Patterns

### Table Naming Convention

All test management tables use `tm_` prefix:
```sql
tm_test_cases
tm_test_sets
tm_test_cycles
tm_test_runs
tm_defects
tm_folders
tm_requirements
```

### Standard Columns

Every table should include:

```sql
CREATE TABLE public.tm_{entity} (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Soft delete
  deleted_at TIMESTAMPTZ NULL,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- ... entity-specific columns
);

-- Auto-update timestamp trigger
CREATE TRIGGER update_{entity}_updated_at
  BEFORE UPDATE ON public.tm_{entity}
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### RLS Policy Pattern

```sql
-- Enable RLS
ALTER TABLE public.tm_{entity} ENABLE ROW LEVEL SECURITY;

-- Read access (authenticated users)
CREATE POLICY "Authenticated users can view {entity}"
  ON public.tm_{entity}
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Write access (owner or admin)
CREATE POLICY "Users can modify their own {entity}"
  ON public.tm_{entity}
  FOR ALL
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );
```

### Enum Pattern

```sql
CREATE TYPE public.tm_status AS ENUM (
  'draft', 'active', 'archived'
);

CREATE TYPE public.tm_priority AS ENUM (
  'critical', 'high', 'medium', 'low'
);

CREATE TYPE public.tm_execution_status AS ENUM (
  'not_run', 'passed', 'failed', 'blocked', 'skipped'
);
```

### Folder/Hierarchy Pattern

```sql
CREATE TABLE public.tm_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.tm_folders(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'test_case', 'test_set', 'requirement'
  path TEXT GENERATED ALWAYS AS (
    -- Materialized path for efficient querying
  ) STORED,
  depth INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for hierarchy queries
CREATE INDEX idx_tm_folders_parent ON public.tm_folders(parent_id);
CREATE INDEX idx_tm_folders_entity_type ON public.tm_folders(entity_type);
```

### Many-to-Many Pattern

```sql
-- Test Case to Test Set mapping
CREATE TABLE public.tm_test_set_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_set_id UUID NOT NULL REFERENCES public.tm_test_sets(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES public.tm_test_cases(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by UUID REFERENCES auth.users(id),
  UNIQUE(test_set_id, test_case_id)
);

CREATE INDEX idx_tm_test_set_cases_set ON public.tm_test_set_cases(test_set_id);
CREATE INDEX idx_tm_test_set_cases_case ON public.tm_test_set_cases(test_case_id);
```

---

## Quick Reference

### Key Files

| Purpose | Path |
|---------|------|
| Sidebar Base | `src/components/layout/SidebarBase.tsx` |
| Top Nav | `src/components/ja/CatalystHeader.tsx` |
| Design Tokens | `src/index.css` |
| Tailwind Config | `tailwind.config.ts` |
| Supabase Client | `src/integrations/supabase/client.ts` |
| Edge Functions | `supabase/functions/{name}/index.ts` |

### Color Quick Reference

| Color | Hex | Usage |
|-------|-----|-------|
| Blue Primary | #2563eb | Actions, links, active states |
| Teal | #0d9488 | Success, passed, done |
| Orange | #d97706 | Warning, blocked |
| Red | #ef4444 | Error, failed, critical |
| Gray (Light) | #6b7280 | Muted text |

### Import Patterns

```typescript
// Supabase
import { supabase } from "@/integrations/supabase/client";

// UI Components
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Icons
import { FileText, Settings, Bug } from "lucide-react";

// Hooks
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

// Utils
import { cn } from "@/lib/utils";
```

---

*Generated for Claude AI module development*
