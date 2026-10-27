# Food Swipe

Decide what to eat by swiping on meal ideas. Gemini suggests dishes from its own knowledge, learns from your swipes, and keeps bringing better ideas. Each dish gets a photo from its Wikipedia article, or from Pexels when Wikipedia has none. "Find a recipe" opens a web search for any dish.

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

Copy the sample settings to `.env.local`, which is gitignored:

```bash
cp .env.example .env.local
```

Open `.env.local` and paste your [Gemini API key](https://aistudio.google.com/apikey) straight after `VITE_GEMINI_API_KEY=`, with no quotes or spaces. Never put a real key in `.env.example`, which is committed.

```bash
npm run dev
```

Vite reads `.env.local` only at startup, so restart the dev server after changing it. The key is optional: without one, the app asks for it on screen and keeps it in that browser, which is how the deployed site works.

For Pexels photos when Wikipedia has none, also add a free [Pexels API key](https://www.pexels.com/api/) after `VITE_PEXELS_API_KEY=`. Without it, photos come from Wikipedia only.

Open the printed URL on your phone (same network, `npm run dev -- --host`) or in a mobile-sized browser window.

### Offline sample mode

To work on the UI without spending Gemini quota, use built-in sample dishes. They still look up photos (Wikipedia, and Pexels if its key is set):

```bash
VITE_IDEA_SOURCE=fixtures npm run dev
```

## Environment

| Variable              | Default            | Purpose                                                                                            |
| --------------------- | ------------------ | -------------------------------------------------------------------------------------------------- |
| `VITE_GEMINI_API_KEY` | none               | Gemini API key for local development. Bundled into the client, so never set it for a public build. |
| `VITE_GEMINI_MODEL`   | `gemini-3.8-flash` | Model that suggests ideas.                                                                         |
| `VITE_IDEA_SOURCE`    | `gemini`           | `gemini` for live ideas, `fixtures` for offline samples.                                           |
| `VITE_PEXELS_API_KEY` | none               | Pexels key for fallback photos. Bundled into the client on purpose (see below).                    |
| `BASE_PATH`           | `/`                | Path the app is served from. The Pages workflow sets it to `/<repo>/`.                             |

## Deploying to GitHub Pages

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) lints, tests, builds, and publishes the site on every push to `main`.

1. Create an empty public repository on GitHub (no README or licence), then add it as `origin` and push `main`.
2. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. For Pexels photos, open **Settings → Secrets and variables → Actions**, choose **New repository secret**, name it `PEXELS_API_KEY`, and paste your Pexels key.
4. If the first push ran before steps 2 and 3, rerun it from **Actions → Deploy to GitHub Pages → Run workflow**.

The site is served at `https://<user>.github.io/<repo>/`. The build contains no Gemini key; the workflow fails if it finds one. The Pexels key is the exception: it is bundled so every visitor gets Pexels photos, which means anyone can read it from the page and all visitors share its 200 searches an hour. When the limit runs out, cards fall back to Wikipedia photos and illustrations. On first open the app asks for a Gemini key and keeps it in that browser only. All your Pages sites share the `<user>.github.io` origin, so they can read each other's browser storage; only host code you trust there.

## Scripts

| Command             | What it does                              |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Dev server with hot reload                |
| `npm run build`     | Type-check and build the PWA into `dist/` |
| `npm run preview`   | Serve the production build                |
| `npm test`          | Unit and integration tests                |
| `npm run typecheck` | TypeScript only                           |
| `npm run lint`      | ESLint                                    |
| `npm run format`    | Prettier                                  |

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
    keys/     ApiKeyStore interface: the Gemini key, kept in the browser today
    photos/   PhotoSource interface: Wikipedia, then Pexels; withPhotos adds them to batches
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

| To change                                               | Edit                                                            |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| Swipe thresholds, re-show and retire rules, batch sizes | `src/config/tuning.ts`                                          |
| What Gemini is told                                     | `src/services/ideas/gemini/prompt.ts` and `src/domain/brief.ts` |
| Colours, fonts, shadows                                 | `src/styles/index.css`                                          |
| Placeholder art palettes and icons                      | `src/ui/lib/art.ts`                                             |
| Photo sources and their order                           | `src/app/services.ts`                                           |
| Photo sizes, deadline, Pexels limits                    | `src/config/tuning.ts` (`photos`)                               |
| User-facing notice wording                              | `src/ui/lib/noticeText.ts`                                      |

### Adding a backend

1. Implement `TasteRepository` (`src/services/storage/TasteRepository.ts`) against your API. The methods map one-to-one to endpoints.
2. Implement `IdeaSource` (`src/services/ideas/IdeaSource.ts`) to post the `Brief` to your server, which calls Gemini with a server-side key.
3. Swap them in `src/app/services.ts`. Nothing else changes.

## Before a public launch

- **Move AI calls server-side.** Today each visitor brings their own Gemini key. A public product should call Gemini from a server with your key, plus rate limits, so visitors need no key.
- **Look photos up on the server.** Today each browser asks Wikipedia and Pexels itself, with a public Pexels key shared by every visitor. A backend should look each dish's photo up once and cache it for everyone.
