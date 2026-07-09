# DRIFT LOG

## D-BUILD-001 (2026-07-09) — legacy OKR stack is LIVE on strata-standalone
Research (done on main) assumed StrategyCockpit had zero importers. On strata-standalone:
`OKRHubV2.tsx` imports StrategyCockpit; `EnterpriseRoutesShell.tsx:39` routes
`/enterprise/objectives`; `WorkTreeHierarchy.tsx:13-15` imports three okr-v2 shared
pills (OkrStatusPill, OkrProgressCell, OkrThemeDot). REQ-016/022/023 therefore remain a
FULL decommission+migrate slice on this branch (extract shared pills first), not a quick
dead-code delete. REQ-017 (Astryx) verified zero importers → deleted this session.
## D-BUILD-002 (2026-07-09) — canonical-chain seed no-op on reference tenant
20260709172000 rule-5/6 UPDATE linked 0 cards: demo cards carried theme_id = ROOT theme (Digital
Market Leadership) while all theme-context objectives are parented to child themes (B2B Growth
Engine, Network Excellence). Rule-6 trigger (objective must belong to the card's own theme) made
the seed a silent no-op. Repaired by 20260709180000 (cards → objective-bearing sub-themes, chain
re-closed): 4/4 linked, proj-objective + rollup edges created. Detected only by post-apply SQL
verification — screenshots would not have caught it.
