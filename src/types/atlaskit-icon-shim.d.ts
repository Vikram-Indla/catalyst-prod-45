// Type-only shim relaxing @atlaskit/icon per-icon prop checking.
// Allows legacy `size`/`primaryColor` props and optional `label` without
// touching hundreds of call sites. Runtime is unaffected — Vite uses node
// resolution; tsconfig `paths` is TS-only.
import type { ComponentType } from 'react';
declare const Icon: ComponentType<any>;
export default Icon;
