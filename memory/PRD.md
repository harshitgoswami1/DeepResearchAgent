# Deep Research — UI/UX PRD

## Original problem statement
> Make the frontend ui highly polished sleek and minimal and also make it responsive

## User-stated design choices
- Theme: **Dark mode**
- Aesthetic: **Editorial / typographic minimal**
- Accent color: **Cyan**
- Scope: **Single page — the chatbot**
- Preserve: nothing

## Architecture
- Turborepo: `apps/web` (Next.js 16 + Tailwind v4) + `apps/api` (FastAPI).
- Single page at `apps/web/app/page.tsx` posts to `${NEXT_PUBLIC_API_URL}/research`.
- Backend untouched.

## What's been implemented (2026-01-10)
1. **Type system** — Fraunces (display serif, italic accents), Inter Tight (body sans), JetBrains Mono (kicker labels). Loaded via `next/font/google` for self-hosting.
2. **Design tokens** — bespoke CSS variables for surfaces, lines, text tiers, and a cyan accent ramp (`#67e8f9` / `#22d3ee` / `#0891b2`). Full CSS rewrite in `globals.css`.
3. **Atmosphere** — solid #06080a base, distant cyan halo at top, subtle SVG grain overlay, refined custom scrollbars, cyan focus rings.
4. **Empty / hero state** — editorial 12-col layout: italic display headline ("A quiet place to *think*"), kicker "✦ Issue №01", staggered rise animations, monochrome starter-prompt chips with cyan hover, and a meta sidebar (Pipeline / Output / Time).
5. **Conversation thread** — asymmetric editorial column (`max-w-760px`). Each turn carries a kicker label (`YOU · 01`, `BRIEF · 02 · …`) with a hairline divider. User messages render as italic Fraunces; assistant briefs as 17px body with generous line-height. Numbered sources list (01/02/...) with `OPEN →` cyan link affordance.
6. **Loading state** — cyan spinning ring + pulsing dot, shimmer text "SEARCHING · SCRAPING · SYNTHESISING", and skeleton bars rising in cadence.
7. **Composer** — fixed bottom, glass-blurred surface with cyan focus glow, auto-growing textarea, `›` mono caret, "Deep mode" pill, cyan submit button with arrow → translation on hover and blinking caret while researching.
8. **Responsive** — generous mobile padding, header status indicator collapses to "Online", meta sidebar stacks below hero on mobile, halo scales down, composer remains tactile.
9. **Accessibility** — visible focus rings, reduced-motion support, `aria-hidden` on decorative glyphs, proper `<label>` for textarea, semantic `<details>`.
10. **Test IDs** — every interactive/critical element has a `data-testid`.

## Verified
- `npx tsc --noEmit` → 0 errors
- Dev server compiled cleanly, rendered empty / response / loading / expanded-sources states (screenshots captured).

## Backlog / future
- P2 — streaming token-by-token rendering of the brief.
- P2 — copy-to-clipboard on the brief and per-source.
- P2 — keyboard shortcut overlay (`?`) listing ↵ send, ⌘K focus composer.
- P2 — light theme toggle if ever desired.
