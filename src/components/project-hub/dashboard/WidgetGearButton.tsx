/**
 * WidgetGearButton — STUB (2026-06-09).
 *
 * Per Vikram /design-critique: gear ⚙ + Gadget Settings modal removed
 * from widget chrome (Jira widgets carry no per-gadget settings cog).
 * Component kept as a no-op so existing callers compile; remove the
 * imports + JSX call sites in a follow-up sweep.
 */
import type { GadgetType } from '@/hooks/useGadgetSettings';

interface Props {
  gadgetType: GadgetType;
  projectKey: string;
  projectId: string | null;
}

export default function WidgetGearButton(_props: Props) {
  return null;
}
