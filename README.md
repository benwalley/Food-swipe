# Food Swipe

Decide what to eat by swiping on meal ideas. Gemini searches the web for real recipes, learns from your swipes, and keeps bringing better ideas.

- **Swipe right**: into the idea, more like it
- **Swipe left**: nah (drag far left: never show this dish)
- **Swipe up**: this exact dish, saved to your list
- **Tap**: flip the card to rate its ingredients (love, not a fan, never)
- **Refine**: set a mood for this session and manage ingredients

The full acceptance criteria and technical approach are in [SPEC.md](SPEC.md).

## Getting started

Requires Node 22 or later.

```bash
npm install
```

Create `.env.local` with your Gemini API key (it's gitignored):

```bash
printf 'VITE_GEMINI_API_KEY=your-key-here\nVITE_GEMINI_MODEL=gemini-3.8-flash\n' > .env.local
```

```bash
npm run dev
```

Open the printed URL on your phone (same network, `npm run dev -- --host`) or in a mobile-sized browser window.

### Offline sample mode

To work on the UI without spending API quota, use built-in sample dishes:

```bash
VITE_IDEA_SOURCE=fixtures npm run dev
```

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_GEMINI_API_KEY` | none | Gemini API key. Bundled into the client, so never deploy a build with a real key publicly. |
| `VITE_GEMINI_MODEL` | `gemini-3.8-flash` | Model used to research ideas. |
| `VITE_IDEA_SOURCE` | `gemini` | `gemini` for live ideas, `fixtures` for offline samples. |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and build the PWA into `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Unit and integration tests |
| `npm run typecheck` | TypeScript only |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

A live test calls the real Gemini API and is skipped unless you pass a key:

```bash
GEMINI_LIVE_KEY=your-key-here npx vitest run src/services/ideas/gemini/GeminiIdeaSource.live.test.ts
```

## Architecture

```
src/
  app/        Composition root (services.ts picks implementations), shell, tabs
  config/     tuning.ts (every threshold) and validated env
  domain/     Pure logic: learning rules, deck building, ingredient matching, AI brief
  services/
    ideas/    IdeaSource interface: Gemini (live), fixtures (offline)
    storage/  TasteRepository interface: localStorage today
  state/      Zustand store that wires domain and services together
  ui/         Components and features (swipe, refine, list, taste, onboarding)
  styles/     Design tokens (light and dark) and Tailwind setup
```

Rules the code follows:

- **The domain layer is pure.** No React, no storage, no network (enforced by ESLint). Every learning rule is unit-tested.
- **Services sit behind interfaces.** The UI and store never know whether ideas come from Gemini or a backend, or whether data lives in localStorage or a server.
- **The store speaks in data.** It emits notices like `{ kind: 'saved' }`, and the UI decides the wording (`ui/lib/noticeText.ts`).
- **Design tokens, not colours.** Components use semantic tokens (`bg-surface`, `text-ink-2`, `text-like`) that flip for dark mode in `styles/index.css`.

### Where to change things

| To change | Edit |
| --- | --- |
| Swipe thresholds, re-show and retire rules, batch sizes | `src/config/tuning.ts` |
| What Gemini is told | `src/services/ideas/gemini/prompt.ts` and `src/domain/brief.ts` |
| Colours, fonts, shadows | `src/styles/index.css` |
| Placeholder art palettes and icons | `src/ui/lib/art.ts` |
| User-facing notice wording | `src/ui/lib/noticeText.ts` |

### Adding a backend

1. Implement `TasteRepository` (`src/services/storage/TasteRepository.ts`) against your API. The methods map one-to-one to endpoints.
2. Implement `IdeaSource` (`src/services/ideas/IdeaSource.ts`) to post the `Brief` to your server, which calls Gemini with a server-side key.
3. Swap them in `src/app/services.ts`. Nothing else changes.

## Before a public launch

- **Move AI calls server-side.** Any client build contains the API key.
- **Review Google's grounding terms.** Search suggestions are shown with results as required, but the terms also restrict storing and reformatting grounded results.
- **Pick a photo source.** Gemini's search returns images for only some dishes; the rest use designed placeholders.
