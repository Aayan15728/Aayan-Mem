# Rejection Ledger (Anti-Memory)
<!--
  PURPOSE: Track architectural paths that were CONSIDERED and REJECTED.
  This is negative-space memory — it prevents the AI from re-suggesting
  ideas that already failed, unless conditions have changed.

  WHY THIS EXISTS:
  AI agents have no memory of what they rejected. Without this file,
  the same bad idea gets proposed every 3 sessions. The Rejection Ledger
  ensures: "We tried this. It failed because X. Don't suggest it unless X changes."

  FORMAT (one line per rejection):
  - [REJ-NNN] <What was considered> | Reason: <why rejected> | Session: <N> | Unblock: <condition to reconsider>

  EXAMPLES:
  - [REJ-001] Prisma ORM | Reason: Breaks Supabase RLS policies | Session: 4 | Unblock: FACT-012 becomes STALE
  - [REJ-002] Edge Middleware auth | Reason: 200ms+ latency on cold start | Session: 6 | Unblock: Edge runtime improves
  - [REJ-003] Framer Motion | Reason: 42KB bundle, exceeds animation budget | Session: 2 | Unblock: Bundle budget increases

  RULES:
  - Every rejection MUST have a Reason and an Unblock condition.
  - If the Unblock condition is met, the agent MAY reconsider the path.
  - REJ-IDs are globally unique and never reused.
  - This file is surfaced during coldstart so the agent sees it immediately.
-->
**Last-Modified-By:** — | **Last-Modified-Session:** —

<!-- Add rejections below. One line per rejected path. -->
- [REJ-001] JSON-based belief graph | Reason: Destroys markdown-native philosophy, becomes a worse Mem0 | Session: 1 | Unblock: Markdown parsing proves insufficient at scale


## Changelog
<!-- Format: - [Session #] Description of what changed. -->
