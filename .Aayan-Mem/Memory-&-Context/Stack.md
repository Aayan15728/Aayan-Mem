# Core Stack & Project Structure
<!-- 
  PURPOSE: Document the exact technologies and directory layout of your project.
  WHEN TO UPDATE: When you add/remove a framework, change deployment, or restructure folders.
  
  FORMAT GUIDE (ESM Syntax):
  - Facts use the Epistemic State Machine format:
    - [STATE] [FACT-NNN] <content> | Source: <file:line> | Verified: S<N> | Deps: [FACT-xxx]
  - Valid states: SUSPECTED, CONFIRMED, STALE, CONTRADICTED
  - Every fact MUST have a Source: field (Witness Protocol)
  - Use Deps: to link causally related facts
  
  EXAMPLE:
  - [CONFIRMED] [FACT-001] Framework is Next.js 14 App Router | Source: package.json:L5 | Verified: S3 | Deps: []
  - [CONFIRMED] [FACT-002] Language is TypeScript strict mode | Source: tsconfig.json:L2 | Verified: S3 | Deps: []
  - [SUSPECTED] [FACT-003] Styling is Tailwind CSS | Source: tailwind.config.ts:L1 | Verified: S1 | Deps: []
-->
**Last-Modified-By:** — | **Last-Modified-Session:** —

<!-- Add your ESM-formatted stack facts below -->
- [CONFIRMED] [FACT-001] CLI engine is pure Node.js with zero dependencies | Source: a-mem.js:L1 | Verified: S1 | Deps: []
- [CONFIRMED] [FACT-002] Memory format is structured markdown, not JSON | Source: rules.md:L9 | Verified: S1 | Deps: [FACT-001]
- [SUSPECTED] [FACT-003] Interactive shell supports readline | Source: a-mem.js:L213 | Verified: S1 | Deps: [FACT-001]


<!-- Map your directory structure below -->
**Directory Map:**


## Changelog
<!-- Format: - [Session #] Description of what changed. -->
