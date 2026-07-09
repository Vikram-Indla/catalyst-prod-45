# DRIFT LOG

## D-BUILD-001 (2026-07-09) — legacy OKR stack is LIVE on strata-standalone
Research (done on main) assumed StrategyCockpit had zero importers. On strata-standalone:
`OKRHubV2.tsx` imports StrategyCockpit; `EnterpriseRoutesShell.tsx:39` routes
`/enterprise/objectives`; `WorkTreeHierarchy.tsx:13-15` imports three okr-v2 shared
pills (OkrStatusPill, OkrProgressCell, OkrThemeDot). REQ-016/022/023 therefore remain a
FULL decommission+migrate slice on this branch (extract shared pills first), not a quick
dead-code delete. REQ-017 (Astryx) verified zero importers → deleted this session.
