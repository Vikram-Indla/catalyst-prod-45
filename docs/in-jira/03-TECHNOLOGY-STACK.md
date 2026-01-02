# 3. Technology Stack

## 3.1 Frontend Technologies

### 3.1.1 Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tooling |
| React Router | 6.30.1 | Routing |

### 3.1.2 UI Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| Tailwind CSS | 3.x | Styling |
| Radix UI | Various | Accessible primitives |
| Lucide React | 0.462.0 | Icons |
| Framer Motion | 12.23.26 | Animations |
| @hello-pangea/dnd | 18.0.1 | Drag and drop |

### 3.1.3 State & Data

| Library | Version | Purpose |
|---------|---------|---------|
| TanStack Query | 5.83.0 | Server state |
| Zustand | 5.0.8 | Client state |
| React Hook Form | 7.61.1 | Forms |
| Zod | 3.25.76 | Validation |

### 3.1.4 Rich Text

| Library | Version | Purpose |
|---------|---------|---------|
| TipTap | 3.13.0 | Rich text editor |
| TipTap Extensions | Various | Tables, tasks, links |

## 3.2 Backend Technologies

### 3.2.1 Database

| Technology | Version | Purpose |
|------------|---------|---------|
| PostgreSQL | 15.x | Primary database |
| Supabase | Latest | Database platform |

### 3.2.2 Edge Functions

| Technology | Purpose |
|------------|---------|
| Deno | Runtime |
| Supabase Functions | Deployment |
| Lovable AI | AI model access |

### 3.2.3 Storage

| Technology | Purpose |
|------------|---------|
| Supabase Storage | File storage |
| CDN | Asset delivery |

## 3.3 Development Tools

### 3.3.1 Testing

| Tool | Version | Purpose |
|------|---------|---------|
| Playwright | 1.57.0 | E2E testing |
| Vitest | Latest | Unit testing |
| axe-core/playwright | 4.11.0 | Accessibility |

### 3.3.2 Code Quality

| Tool | Purpose |
|------|---------|
| ESLint | Linting |
| Prettier | Formatting |
| TypeScript | Type checking |

## 3.4 Dependency Matrix

```typescript
// Core dependencies from package.json
const coreDependencies = {
  // React ecosystem
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.30.1",
  
  // State management
  "@tanstack/react-query": "^5.83.0",
  "zustand": "^5.0.8",
  
  // UI components
  "@radix-ui/react-dialog": "^1.1.14",
  "@radix-ui/react-dropdown-menu": "^2.1.15",
  "@radix-ui/react-tabs": "^1.1.12",
  "@radix-ui/react-tooltip": "^1.2.7",
  
  // Drag and drop
  "@hello-pangea/dnd": "^18.0.1",
  
  // Rich text
  "@tiptap/react": "^3.13.0",
  "@tiptap/starter-kit": "^3.13.0",
  
  // Forms
  "react-hook-form": "^7.61.1",
  "zod": "^3.25.76",
  "@hookform/resolvers": "^3.10.0",
  
  // Utilities
  "date-fns": "^3.6.0",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.6.0",
  
  // Supabase
  "@supabase/supabase-js": "^2.84.0",
};
```

## 3.5 Browser Support

| Browser | Minimum Version |
|---------|----------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

## 3.6 Performance Budgets

| Metric | Budget |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Time to Interactive | < 3.5s |
| Cumulative Layout Shift | < 0.1 |
| Total Bundle Size | < 500KB (gzipped) |
