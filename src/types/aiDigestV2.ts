export type RiskHorizon = 'critical_now' | 'today' | 'this_week' | 'good_news'
export type DigestPriority = 'HIGH' | 'MED' | 'LOW'

export interface DigestItemV2 {
  priority:       DigestPriority
  risk_horizon:   RiskHorizon
  title:          string
  trigger:        string
  consequence:    string
  action:         string
  detail:         string
  hub:            string
  cta_label:      string
  cta_path:       string
  confidence:     number
  entity_id:      string | null
  project_name:   string | null
  hub_colour:     string | null
}

export interface DigestResultV2 {
  summary:        string
  role_persona:   string
  has_critical:   boolean
  generated_at:   string
  items:          DigestItemV2[]
}

export interface AiDigestResponseV2 {
  digest:         DigestResultV2 | null
  cached:         boolean
  empty?:         boolean
  error?:         string
}

export const HUB_COLOURS: Record<string, string> = {
  ProjectHub:   '#2563EB',
  ReleaseHub:   '#7C3AED',
  IncidentHub:  '#DC2626',
  TestHub:      '#D97706',
  TaskHub:      '#0D9488',
  StrategyHub:  '#374151',
  ProductHub:   '#374151',
  PlanHub:      '#374151',
}

export const CTA_PATH_ALLOWLIST: string[] = [
  '/project-hub',
  '/release-hub',
  '/test-hub',
  '/incident-hub',
  '/task-hub',
  '/strategy-hub',
  '/product-hub',
  '/plan-hub',
]

export function sanitiseCTAPath(path: string): string {
  const allowed = CTA_PATH_ALLOWLIST.find(p => path.startsWith(p))
  return allowed ? path : '/project-hub'
}

export function clampConfidence(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)))
}
