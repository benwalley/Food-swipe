# Food Swipe — spec

A mobile-first single-page app for deciding what to eat by swiping on meal ideas the way you swipe on Tinder. AI suggests ideas from its own knowledge, learns from your swipes, and keeps bringing better ones.

**Design principle:** the main screen stays as simple as Tinder (one card, three swipes, three buttons). More control is always one gesture or one tap away, never in the way.

---

## Glossary

| Term                  | Meaning                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| Dish                  | One specific dish Gemini suggested (title, ingredients, and a photo when one is found).              |
| Idea                  | The general concept behind a dish (`ideaKey`, e.g. `thai-curry`). Many dishes share an idea.         |
| Nah                   | Swipe left. "Not into this idea."                                                                    |
| Never                 | Drag left past the second threshold. "Never show me this dish."                                      |
| Into it               | Swipe right. "I like this idea — more like it."                                                      |
| This one              | Swipe up. "I want this specific dish." Saves it to Your list.                                        |
| Ingredient preference | Love / Not a fan / Never on an ingredient family (e.g. mushrooms). Long-term, applies to every meal. |
| Mood                  | Session-only steering (quick, cozy, "no seafood this week").                                         |
| Session               | One sitting. Holds the "don't repeat" lists and mood.                                                |
| Batch                 | A group of dishes returned by one AI request.                                                        |
| Meal                  | Breakfast, lunch, dinner, snack, or dessert. Each has its own deck.                                  |

---

## Acceptance criteria

### Meal toggle (MT)

- **MT-1** A segmented control at the top shows five options with an icon and label each: Breakfast, Lunch, Dinner, Snack, Dessert.
- **MT-2** On a new session, the selected meal defaults by local time: breakfast 5:00–10:29, lunch 10:30–14:29, snack 14:30–16:59, dinner 17:00–20:59, dessert 21:00–4:59.
- **MT-3** Each meal has its own deck and its own session lists. Switching meals keeps your place in each deck for the rest of the session.
- **MT-4** Switching to a meal with no cards yet shows the loading card and starts a batch request for that meal.
- **MT-5** Ingredient preferences, Your list, and long-term dish memory are shared across all meals.

### Deck and cards (DK)

- **DK-1** One card is on top, with the next card visible slightly behind it.
- **DK-2** The front of the card shows the dish art, title, a one-line description, up to four key ingredient families as plain text, and its tags.
- **DK-3** If the dish has no photo, or its photo fails to load within 4 seconds, the card shows a styled placeholder (colour and icon picked from the cuisine or meal), never a broken image.
- **DK-4** A dish you've seen in an earlier session shows a short memory line, e.g. "Passed once before" or "On your list".
- **DK-5** A dish whose ingredients include an ingredient marked Never is never shown, even if the AI returns it.
- **DK-6** The same dish (matched by meal and normalized title) is never shown twice in one session.

### Swiping (SW)

- **SW-1** Dragging the card moves it with your finger and tilts it in proportion to the horizontal distance.
- **SW-2** While dragging, a stamp fades in to show what will happen on release: "Nah" (left), "Into it" (right), "This one!" (up).
- **SW-3** Releasing past the commit threshold (30% of card width horizontally, or 25% of card height upward with the upward distance greater than the sideways distance) commits the swipe and the card flies off in that direction.
- **SW-4** A quick flick shorter than the threshold also commits a Nah, Into it, or This one in the direction of the flick.
- **SW-5** Dragging left past the Never threshold (60% of screen width) changes the stamp from "Nah" to "Never" and tints the card red. On Android, the phone gives a short vibration as you cross it. Releasing there records Never.
- **SW-6** Dragging back inside the Never threshold before releasing reverts to Nah. Never is triggered only by distance, never by flick speed.
- **SW-7** Releasing short of every threshold springs the card back to centre with no verdict.
- **SW-8** Buttons below the card do the same as the swipes: X (Nah), star (This one), heart (Into it). Long-pressing X records Never.
- **SW-9** Undo restores the last card to the top and removes its verdict and any memory or list changes it caused. Undo works back to the start of the session.
- **SW-10** This one shows a short "Saved to your list" toast. Never shows "Won't show this again" with an Undo action.
- **SW-11** Swiping works whether the card is showing its front or back.

### Card back and ingredients (IN)

- **IN-1** Tapping the card (less than 8px of movement) flips it over with a 3D animation. Tapping again flips it back.
- **IN-2** The back shows the dish title, the dish's key ingredient families (4–8), and a "Find a recipe" button that opens a web search for the dish in a new tab. A specific name shows underneath when it differs from the family (e.g. "mushrooms" with "cremini" underneath).
- **IN-3** Each ingredient row has three controls: Love, Not a fan, Never. Tapping one selects it, and tapping the selected one clears it.
- **IN-4** Ingredient changes save immediately and apply to every meal. A toast confirms: "Love mushrooms, noted", "Less mushrooms from now on", or "No more mushrooms, anywhere".
- **IN-5** Marking an ingredient Never keeps the current card visible so you can still swipe it. Later cards containing that ingredient are skipped, with a toast saying how many were skipped.
- **IN-6** The next card always opens on its front.

### Refine (RF)

- **RF-1** A floating "Refine" pill sits at the top of the swipe screen and shows a count badge when any session mood is active.
- **RF-2** Tapping Refine opens a bottom sheet. Tapping the backdrop, swiping the sheet down, or tapping close dismisses it.
- **RF-3** Mood section: multi-select tiles with an icon each — Quick, Cozy, Light, Adventurous, Cheap, Crowd-pleaser, Healthy.
- **RF-4** A "Tell the chef" text field takes up to 140 characters (e.g. "no seafood this week").
- **RF-5** Mood selections and the text field are session-only and reset on a new session.
- **RF-6** Ingredients section: every saved ingredient preference shows as a chip with its state. Tapping a chip cycles Love → Not a fan → Never → cleared.
- **RF-7** An "Add ingredient" field plus an Avoid button adds an ingredient as Not a fan. Submitting an empty field shows "Type an ingredient first" inline and adds nothing.
- **RF-8** "Show me ideas" closes the sheet. If the mood changed, a new batch is requested right away and its cards go in front of the existing queue when they arrive.
- **RF-9** The sheet also has a "Start new session" action (see SE-3).

### Sessions (SE)

- **SE-1** A new session starts when the app opens after more than 3 hours of inactivity.
- **SE-2** A session holds the per-meal lists of seen dishes and verdicts, plus the mood.
- **SE-3** "Start new session" ends the current session immediately and keeps all long-term data.
- **SE-4** Nah on a dish also hides other dishes with the same idea for the rest of that session.

### Learning and re-show rules (LR)

- **LR-1** Every verdict is saved as a long-term event: dish, idea, meal, verdict, timestamp, session, and the ingredient preferences that applied at the time.
- **LR-2** A dish you Nah'd can reappear in a later session (not the same one). Its memory line says it was passed before.
- **LR-3** A dish with two Nahs across sessions and no Into it or This one is retired and never shown again.
- **LR-4** A dish marked Never is retired immediately.
- **LR-5** A dish you liked (Into it or This one) can reappear in later sessions as a re-show.
- **LR-6** A dish liked in two or more sessions with no Nah since then becomes a staple. Each session includes at least one staple per meal when one exists. A later Nah removes staple status.
- **LR-7** Re-shows (LR-2, LR-5, LR-6) make up no more than 20% of the cards in a session.
- **LR-8** A dish on Your list is only retired by an explicit Never, never by the Nah count.
- **LR-9** Ingredient Not a fan pushes dishes where that ingredient is a main component to the back of the queue. As a supporting ingredient, the penalty is smaller.
- **LR-10** All thresholds above live in one config file and are easy to tune.

### AI batches (AI)

- **AI-1** The first time a meal's deck is opened, the app requests about 50 dishes for it: five parallel batches of 10, each from a different angle (classics, global, quick, seasonal, wildcard), plus a quick batch of 4 so the first cards arrive in about 8 seconds.
- **AI-2** After every 10 verdicts in a meal, or when fewer than 8 cards are queued, the app requests a follow-up batch of about 20 in the background, so the deck never visibly runs dry.
- **AI-3** Each request carries a brief built from: meal, mood, ideas you're into, dishes saved with This one, ideas you passed on, ingredient Love / Not a fan / Never, retired dishes, staples, and the titles already seen this session.
- **AI-4** Each follow-up batch is roughly 70% close to what you like and 30% new directions, so the deck doesn't collapse into one cuisine.
- **AI-5** Each dish returned has: title, the title of its English Wikipedia article (or null), description (120 characters max), meal, cuisine, idea key, tags, typical total time or null, and 4–8 ingredients with name, family, and role (main or supporting). Ideas come from the model's own knowledge, with no web search; photos are added afterwards (PH).
- **AI-6** Dishes that fail validation, duplicate seen or retired dishes, or contain a Never ingredient are dropped on the client.
- **AI-7** While the first batch loads, the stack shows an animated "Cooking up ideas…" card.
- **AI-8** If a request fails, the loading card turns into a "Couldn't load ideas" card with a Retry button. Cards already in the deck stay usable.

### Photos (PH)

- **PH-1** Each batch gets photos before it reaches the deck. First choice is the lead image of the Wikipedia article Gemini named, if it is freely licensed. Missing articles, disambiguation pages, redirects to a section of a broader article, and images narrower than 480px are skipped.
- **PH-2** Dishes still without a photo get one from Pexels, searched by dish name. A result is used only if its description mentions the dish or one of its main ingredients, so a search for "pad kra pao" can't return a notepad.
- **PH-3** Photo lookups never fail a batch and never hold it back more than 2.5 seconds. Dishes without a photo by then keep the illustration.
- **PH-4** Photos are saved with the dish, so Your list keeps them. List thumbnails use a small (330px) version.
- **PH-5** Every photo carries its credit where it is shown in full (cards and dish details), as a small link to the photo's page: author and licence for Wikipedia photos, photographer and "Pexels" for Pexels photos. If the name is long, it is shortened and the licence stays whole. The Taste tab credits Wikimedia Commons and Pexels.
- **PH-6** When Pexels reports its hourly limit is used up, the app stops asking it for 15 minutes. A rejected Pexels key stops Pexels until the app reloads.

### Your list (YL)

- **YL-1** The Your list tab shows every dish saved with This one, newest first, with art, title, source, and when it was saved. A filter narrows it by meal, and the tab icon shows a count.
- **YL-2** Tapping a dish opens its details: description, "Find a recipe", and ingredient ratings. You can remove it from the list (with Undo). That doesn't count as a Nah.

### Taste (TS)

- **TS-1** The Taste tab groups every ingredient preference under Love, Not a fan, and Never, with the same cycling chips and add field as Refine.
- **TS-2** Retired dishes are listed with a "Bring back" action that makes their earlier verdicts stop counting.
- **TS-3** It shows when the current session started and how many swipes it has, with "Start a new session".

### Settings (ST)

- **ST-1** The Gemini key is pasted into the app and kept only in that browser, so a public build ships without one. Taste has a Gemini key section to add, change, or remove it. For local development, `VITE_GEMINI_API_KEY` in the gitignored `.env.local` works too; a pasted key takes its place.
- **ST-2** With no key, the deck shows a card that explains why one is needed and takes the key right there; saving it loads ideas straight away. A rejected key gets its own explanation and the same field.
- **ST-3** "Export my data" downloads a JSON file of every long-term record. "Erase everything" asks for confirmation, then clears all stored data. "Show the tutorial again" replays MB-5.
- **ST-4** The Pexels key is built into the site from `VITE_PEXELS_API_KEY` (a GitHub Actions secret when deploying), so every visitor gets Pexels photos. This is a deliberate trade-off: anyone can read the key from the page, and all visitors share its limit of 200 searches an hour. Without a key, photos come from Wikipedia only.

### Persistence (PS)

- **PS-1** All long-term data (events, dish memory, ingredient preferences, Your list) and the current session survive closing and reopening the app.
- **PS-2** Stored data carries a schema version and is validated on load. A collection that fails validation is set aside as a backup instead of crashing the app.
- **PS-3** The UI never talks to storage directly. It only uses the repository interface (see technical approach), so a backend can replace local storage without UI changes.

### Mobile, PWA, and accessibility (MB)

- **MB-1** The layout is designed for portrait phones from 360px to 430px wide, with no horizontal scrolling. On wider screens it stays centred at phone width.
- **MB-2** The app can be installed to the home screen as a PWA, opens full screen, and shows the app shell offline.
- **MB-3** Pull-to-refresh and browser back-swipe gestures don't fire while dragging a card.
- **MB-4** Every gesture has a button or accessible action equivalent, and all controls have accessible labels. Touch targets are at least 44×44px. On desktop: ← Nah, Shift+← Never, → Into it, ↑ This one, Space flips, ⌘Z undoes.
- **MB-5** On first launch, a dismissible four-step walkthrough teaches: swipe right for into it, left for nah (far left for never), up for this one, and tap to flip.
- **MB-6** Animations respect the reduce-motion setting.
- **MB-7** The app follows the phone's light or dark setting.

---

## Technical approach

### Stack

- **Vite + React + TypeScript**, deployed as static files (the PWA comes from `vite-plugin-pwa`).
- **Motion** (`motion/react`) for drag, springs, fly-off, and the 3D flip.
- **Tailwind CSS v4** with semantic colour tokens that flip for dark mode. Fraunces (display) and Inter (UI), self-hosted.
- **Zustand** for app state. **Zod** validates AI output; **zod/mini** validates stored data and config, keeping the main bundle small.
- **`@google/genai`** (Interactions API) for Gemini, loaded lazily on the first batch.
- **Vitest** for domain, services, and store integration tests.

### Layers

```
app/           Composition root (picks implementations), shell, tab routing
ui/            Components and features: swipe, refine, list, taste, onboarding
state/         Zustand store: orchestrates domain + services, owns the session
domain/        Pure TS, no I/O: types, learning rules, deck builder, ingredient matching, brief builder
config/        Tuning thresholds and validated env
services/
  ideas/       IdeaSource interface      → GeminiIdeaSource (browser today) | FixtureIdeaSource (offline) | backend later
  storage/     TasteRepository interface → LocalStorageRepository (today) | backend later
```

The domain layer is pure functions (enforced by lint), so the learning rules get thorough unit tests with no mocking.

### Backend-ready seams

- `TasteRepository` is fully async with granular methods (append event, set preference, save dish), so swapping in an HTTP backend changes nothing above it.
- Long-term data is an **append-only event log** of verdicts plus small maps (preferences, saved, restores). The log syncs cleanly to a server later.
- Every record has a client-generated UUID and timestamps, ready for future sync.
- `IdeaSource` takes a `Brief` and returns validated `Dish[]`. Today it calls Gemini from the browser. Later the same brief goes to your backend, which holds the key and can cache results across users.
- `ApiKeyStore` holds the user's Gemini key (localStorage today). With a backend it goes away.

### Hosting

GitHub Pages, deployed by a GitHub Actions workflow on every push to `main`. The build is served under `/<repo>/` (`BASE_PATH`), routing uses the URL hash so no server rewrites are needed, and the workflow refuses to publish a build that contains anything resembling a Google API key. The Pexels key comes from the `PEXELS_API_KEY` repository secret.

### Data model (core types)

See `src/domain/types.ts`. `Dish`, `Batch`, `VerdictEvent`, `PrefEntry`, `SavedEntry`, `Session` (per-meal decks plus mood), and `TasteData` (everything persisted). `Dish.photo` holds the photo with its credit (`source`, `author`, `license`, `pageUrl`), and `Dish.wikipediaTitle` the article Gemini named. Dishes saved before photos existed load with both set to null.

Dish memory (counts, retired, staple) is derived from the event log and memoized. Dish records are pruned at each new session to those referenced by events, Your list, or live decks.

### AI integration

- **Call:** `ai.interactions.create` with `gemini-3.8-flash` (configurable), `thinking_level: "low"`, `store: false`, and no tools. Ideas come from the model's own knowledge.
- **Output:** JSON via `response_format` with a schema generated from Zod. Each dish is validated on its own, so one bad entry doesn't sink a batch.
- **Recipes:** "Find a recipe" opens a web search for the dish name (`src/ui/lib/links.ts`). No search API is called, so it costs nothing.
- **Errors:** mapped to `auth`, `quota`, `network`, `invalid-output`, `config`, `unknown`. The SDK retries connection errors twice. Requests can be aborted.
- **Brief:** a compact text block built by `domain/brief.ts`, capped to the most recent and strongest signals.
- **Loading:** the Gemini SDK is loaded lazily on the first batch, keeping it out of the initial bundle.

### Photo integration

- **Seam:** `PhotoSource` (`src/services/photos/`) finds photos for a list of dishes. `withPhotos` wraps any `IdeaSource` and adds them to each batch under a deadline. `firstMatch(wikipedia, pexels)` asks Pexels only about dishes Wikipedia couldn't match.
- **Wikipedia:** two requests per batch to the MediaWiki Action API with anonymous CORS (`origin=*`), no key. The first gets each article's lead image (`prop=pageimages`, `pilicense=free`, with redirects resolved and disambiguation flagged). The second gets each image's author and licence (`prop=imageinfo`, `extmetadata`). The author arrives as HTML and is reduced to plain text through an inert `DOMParser` document.
- **Pexels:** one search per dish (`orientation=landscape`, 8 results), at most 3 at a time, with the key in the `Authorization` header.
- **Safety:** responses are validated with zod. Only `https` image and credit URLs are used, and credits render as text, never HTML.

### Measured in testing

- 10 dishes in about 16 seconds; 4 dishes in about 8 seconds.
- Under a cent per batch of 10 in tokens, so a heavy session costs a few cents at most.
- Ideas were varied, real, home-cookable dishes with useful ingredient families, and a "never mushrooms" preference was respected.
- An earlier version used Google Search for every card: about 12 searches per 10 dishes, roughly 3.4¢ per swipe beyond the free tier. Dropping search removed that cost and Google's grounding terms along with it.
- Browser calls to Gemini work (CORS is allowed).
- Browser calls to the Wikipedia Action API and to Pexels work (both allow any origin).
- Wikipedia had a free photo for 7 of 8 typical Gemini dishes. The miss was a spelling of pad kra pao that Wikipedia doesn't redirect, which asking Gemini for Wikipedia's own title avoids. Its two photo requests add about 0.4 seconds to a batch.

### Gesture implementation notes

- The card uses Motion's `drag` driven by drag controls, so taps on buttons and the scrolling ingredient list never start a drag. Release logic reads offset and velocity and applies SW-3 to SW-7.
- Tap versus drag is decided by total movement under 8px.
- The flip is a `rotateY` on an inner wrapper with `backface-visibility: hidden` faces, so the drag transform and the flip don't fight.
- Android vibration uses `navigator.vibrate` after the first user interaction. iOS Safari has no vibration API, so iPhones get the visual change only.

### Out of scope for v1

Accounts and sync, the backend itself, recipe links, sharing lists, shopping lists, nutrition data, and multiple users on one device.

---

## Before a public launch

1. **Backend for AI calls.** Today each visitor pastes their own Gemini key. Move `IdeaSource` behind a server that holds the key, applies rate limits, and can cache popular ideas across users.
2. **Photos through the backend.** Look each dish's photo up once on the server and cache it for everyone. That keeps the Pexels key private and stops visitors from sharing its 200 searches an hour. Pexels raises limits for free for apps that credit it. With the backend's `IdeaSource` returning dishes with photos, drop `withPhotos` from `src/app/services.ts`.
