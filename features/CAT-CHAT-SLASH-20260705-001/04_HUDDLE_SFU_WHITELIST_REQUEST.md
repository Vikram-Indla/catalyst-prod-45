# Dependency whitelist request — Huddle beyond 4 participants (SFU)

**Status:** BLOCKED on approval. Not built. Requires a new external dependency +
running infrastructure, which trips the CLAUDE.md "DEPENDENCY WHITELIST RULE".

## Why the cap exists (not a bug)
The current huddle is a **full peer-to-peer mesh** (`src/lib/chat/huddle/HuddleMesh.ts`):
every participant opens a direct `RTCPeerConnection` to every other participant. Uplink
per client is `N−1` audio streams; total connections scale `O(N²)`. It holds to ~4, then
bandwidth/CPU degrade sharply. `HUDDLE_CAP = 4` (`useHuddleData.ts:15`) reflects that limit.

Going past 4 requires an **SFU** (Selective Forwarding Unit): each client sends ONE stream
up to a media server and receives the others down. That server is a new dependency + a
running, hosted service — hence this request.

## No-dependency fallback (what ships without approval)
Mesh stays capped at 4. Attempting a 5th join already surfaces "Huddle is full" honestly.
Everything else (start/join/leave/mute, incoming ring, cleanup, summary) is production-ready.

## Options

### Option A — LiveKit Cloud (managed SFU) — RECOMMENDED
| Field | Detail |
|---|---|
| Package | `livekit-client` (browser SDK) + LiveKit Cloud (hosted SFU) |
| Purpose | Scalable multi-party audio (and later video) rooms |
| Feature enabled | Huddles of 5–50+ participants; active-speaker, simulcast, adaptive bitrate |
| Why current repo can't | Mesh is `O(N²)`; no media server exists in the stack |
| Existing alternative | None — the repo has no SFU |
| License | Apache-2.0 (SDK); LiveKit Cloud is a paid managed service |
| Security risk | Media relayed through LiveKit infra; JWT room tokens minted server-side (an edge function, mirroring the existing `turn-credentials` fn) — no long-lived secrets client-side |
| Bundle-size risk | `livekit-client` ~120–160 KB gzipped; lazy-load behind the huddle entry so it never touches the chat bundle |
| Maintenance risk | Low — actively maintained, large community; managed service removes ops burden |
| Cost | Usage-based (participant-minutes) — a real recurring bill, product decision |
| Mandatory/optional | Optional feature; required only to exceed 4 participants |

### Option B — mediasoup (self-hosted SFU)
- Full control, no per-minute vendor bill, but **you run and scale the media server** (Node
  workers, TURN, autoscaling, monitoring). Highest ops + failure-mode surface.
- License MIT. Best when data residency / cost-at-scale rule out managed.
- This is the path where I'd recommend **Fable 5** for the integration (custom signalling +
  media-server plumbing, many edge cases).

### Option C — Daily / Twilio (managed, turnkey)
- Fastest integration, prebuilt call objects; higher per-minute cost, more vendor lock-in
  than LiveKit's OSS SDK.

## Recommendation
**LiveKit Cloud (Option A).** Best balance: OSS Apache-2.0 client, managed SFU (no media-server
ops), lazy-loaded so zero bundle impact on chat, and a token pattern that reuses the existing
`turn-credentials` edge-function shape. Migration is contained: swap `HuddleMesh` for a LiveKit
room adapter behind the existing huddle store interface; signalling moves from Supabase
broadcast to LiveKit; the UI (HuddlePanel, participant list, mute) is unchanged.

## What I need from you to proceed
1. Approve an SFU path (A / B / C).
2. For a managed option: confirm the account + that a usage-based bill is acceptable.
3. Then I produce a Plan Lock: token edge-function, `HuddleMesh`→adapter swap, cap raise,
   tests, and a staged rollout behind a flag.
