import { primitives, semantic } from "./definitions";
import { makeVars } from "./_buildVars";

const colorPrimitiveVars = makeVars(primitives.color, ["color"]);
const colorSemanticVars = makeVars(semantic.light.color, ["color"]);

/**
 * Color tokens — primitive ramps and theme-aware semantic colors, both under
 * the same `color` namespace.
 *
 * Primitive ramps (escape hatch — reach for these only when no semantic
 * token fits): `color.neutral`, `color.blue`, `color.red`, `color.yellow`,
 * `color.green`, `color.purple`.
 *
 * Semantic groups (preferred): `color.surface`, `color.text`, `color.border`,
 * `color.accent`, `color.danger`, `color.success`, `color.warning`.
 */
export const color = { ...colorPrimitiveVars, ...colorSemanticVars };

export const space = makeVars(primitives.space, ["space"]);
export const radius = makeVars(primitives.radius, ["radius"]);
export const fontFamily = makeVars(primitives.font.family, ["font", "family"]);
export const fontSize = makeVars(primitives.font.size, ["font", "size"]);
export const fontWeight = makeVars(primitives.font.weight, ["font", "weight"]);
export const lineHeight = makeVars(primitives.font.lineHeight, ["font", "line-height"]);

/**
 * Semantic typography slots — the design-system text styles.
 *
 * Each slot is `{ fontSize, fontWeight, lineHeight, fontFamily }`
 * pointing at CSS variables. Spread one into a `style` prop to apply
 * the full style, or destructure properties for finer control.
 *
 * Slots:
 * - `typography.heading.{xxlarge|xlarge|large|medium|small|xsmall|xxsmall}` — display weight 653
 * - `typography.body.{xlarge|large|medium|small}` — default weight 400 (override with `<Text weight="...">`)
 * - `typography.metric.{large|medium|small}` — bold numeric, weight 653, tabular-friendly
 * - `typography.code` — monospace inline / block code
 */
export const typography = makeVars(primitives.typography, ["typography"]);
export const borderWidth = makeVars(primitives.borderWidth, ["border-width"]);
export const motion = makeVars(primitives.motion, ["motion"]);
export const zIndex = makeVars(primitives.zIndex, ["z-index"]);
export const elevation = makeVars(semantic.light.elevation, ["elevation"]);

export { TOKEN_PREFIX } from "./_buildVars";
