# Food Swipe — spec

A mobile-first single-page app for deciding what to eat by swiping on meal ideas the way you swipe on Tinder. AI searches the web for ideas, learns from your swipes, and fetches better ideas as you go.

**Design principle:** the main screen stays as simple as Tinder (one card, three swipes, three buttons). More control is always one gesture or one tap away, never in the way.

---

## Glossary

| Term | Meaning |
|---|---|
| Dish | One specific recipe from the web (title, link, image, ingredients). |
| Idea | The general concept behind a dish (`ideaKey`, e.g. `thai-curry`). Many dishes share an idea. |
| Nah | Swipe left. "Not into this idea." |
| Never | Drag left past the second threshold. "Never show me this dish." |
| Into it | Swipe right. "I like this idea — more like it." |
| This one | Swipe up. "I want this specific dish." Saves it to Your list. |
| Ingredient preference | Love / Not a fan / Never on an ingredient family (e.g. mushrooms). Long-term, applies to every meal. |
| Mood | Session-only steering (quick, cozy, "no seafood this week"). |
| Session | One sitting. Holds the "don't repeat" lists and mood. |
| Batch | A group of dishes returned by one round of AI research. |
| Meal | Breakfast, lunch, dinner, snack, or dessert. Each has its own deck. |

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
- **DK-2** The front of the card shows the dish image, title, a one-line description, the source name, and up to four key ingredient families as plain text.
- **DK-3** If the image URL is missing or fails to load within 4 seconds, the card shows a styled placeholder (colour and icon picked from the cuisine or meal), never a broken image.
- **DK-4** A dish you've seen in an earlier session shows a short memory line, e.g. "Passed once before" or "On your list".
- **DK-5** A dish whose ingredients include an ingredient marked Never is never shown, even if the AI returns it.
- **DK-6** The same dish (matched by normalized recipe URL, or by normalized title when the URL differs) is never shown twice in one session.

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
- **IN-2** The back shows the dish title, a "View recipe" link that opens the source in a new tab, and the dish's key ingredient families (4–8). A specific name shows underneath when it differs from the family (e.g. "mushrooms" with "cremini" underneath).
- **IN-3** Each ingredient row has three controls: Love, Not a fan, Never. Tapping one selects it, and tapping the selected one clears it.
- **IN-4** Ingredient changes save immediately and apply to every meal. A toast confirms: "Love mushrooms, noted", "Less mushrooms from now on", or "No more mushrooms, anywhere".
- **IN-5** Marking an ingredient Never keeps the current card visible so you can still swipe it. Later cards containing that ingredient are skipped, with a toast saying how many were skipped.
- **IN-6** The next card always opens on its front.

### Refine (RF)
- **RF-1** A small floating "Refine" pill sits at the top of the card stack and shows a count badge when any session mood is active.
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
- **AI-1** The first time a meal's deck is opened, the app requests about 50 dishes for it. They arrive as five parallel sub-batches of 10, each from a different angle (classics, global, quick, seasonal, wildcard). Cards appear as soon as the first sub-batch lands.
- **AI-2** After every 10 verdicts in a meal, or when fewer than 8 cards are queued, the app requests a follow-up batch of about 20 in the background, so the deck never visibly runs dry.
- **AI-3** Each request carries a brief built from: meal, mood, ideas you're into, dishes saved with This one, ideas you passed on, ingredient Love / Not a fan / Never, retired dishes, staples, and the titles already seen this session.
- **AI-4** Each follow-up batch is roughly 70% close to what you like and 30% new directions, so the deck doesn't collapse into one cuisine.
- **AI-5** Each dish returned has: title, description (120 characters max), meal, recipe URL, source name, image URL or null, cuisine, idea key, tags, total time or null, and 4–8 ingredients with name, family, and role (main or supporting).
- **AI-6** Dishes that fail validation, duplicate seen or retired dishes, or contain a Never ingredient are dropped on the client.
- **AI-7** While the first batch loads, the stack shows an animated "Cooking up ideas…" card.
- **AI-8** If a request fails, the loading card turns into a "Couldn't load ideas" card with a Retry button. Cards already in the deck stay usable.

### Your list (YL)
- **YL-1** An icon in the header opens Your list: every dish saved with This one, grouped by meal, newest first, with image, title, and recipe link.
- **YL-2** You can remove a dish from Your list. That doesn't count as a Nah.

### Settings (ST)
- **ST-1** Settings has a field for the Claude API key, stored only on this device, with a note that it's visible to anyone who uses this device.
- **ST-2** With no key saved, the deck shows a card explaining that a key is needed, with a button that opens Settings.
- **ST-3** "Export my data" downloads a JSON file of every long-term record. "Erase everything" asks for confirmation, then clears all stored data.

### Persistence (PS)
- **PS-1** All long-term data (events, dish memory, ingredient preferences, Your list) and the current session survive closing and reopening the app.
- **PS-2** Stored data carries a schema version, and the app migrates older versions on load.
- **PS-3** The UI never talks to storage directly. It only uses the repository interface (see technical approach), so a backend can replace local storage without UI changes.

### Mobile, PWA, and accessibility (MB)
- **MB-1** The layout is designed for portrait phones from 360px to 430px wide, with no horizontal scrolling. On wider screens it stays centred at phone width.
- **MB-2** The app can be installed to the home screen as a PWA, opens full screen, and shows the app shell offline.
- **MB-3** Pull-to-refresh and browser back-swipe gestures don't fire while dragging a card.
- **MB-4** Every gesture has a button or accessible action equivalent, and all controls have accessible labels. Touch targets are at least 44×44px.
- **MB-5** On first launch, a dismissible three-step coach mark teaches: swipe sideways for the idea, swipe up for this one, drag far left for never, tap to flip.
- **MB-6** Animations respect the reduce-motion setting (fades instead of flies and flips).

---

## Technical approach

### Stack
- **Vite + React + TypeScript**, deployed as static files (the PWA comes from `vite-plugin-pwa`).
- **Motion** (`motion/react`) for drag, springs, fly-off, and the 3D flip.
- **Tailwind CSS** for styling.
- **Zustand** for app state, and **Zod** for validating AI output and stored data.
- **`@anthropic-ai/sdk`** for Claude calls.
- **Vitest** for domain logic. **Playwright** (mobile viewport, touch emulation) for gesture and flow smoke tests.

### Layers

```
ui/            React components: MealToggle, Deck, SwipeCard (front/back), RefineSheet, YourList, Settings
state/         Zustand store: orchestrates domain + services, owns the session
domain/        Pure TS, no I/O: types, learning rules, deck builder, ingredient matching, brief builder, thresholds config
services/
  ideas/       IdeaSource interface      → ClaudeIdeaSource (browser-direct today) | ApiIdeaSource (later)
  store/       TasteRepository interface → LocalStorageRepository (today)       | ApiRepository (later)
```

The domain layer is pure functions, so the learning rules (LR-*) get thorough unit tests with no mocking.

### Backend-ready seams
- `TasteRepository` is fully async (`Promise`-based) even though localStorage is synchronous, so swapping in an HTTP backend changes nothing above it.
- Long-term data is an **append-only event log** (verdicts and ingredient-preference changes) plus derived snapshots (dish memory, preferences, Your list). The log syncs cleanly to a server later: post the events and let the server rebuild the snapshots.
- Every record has a client-generated UUID and an `updatedAt` timestamp, ready for future sync and conflict handling.
- `IdeaSource` takes a `Brief` and returns validated `Dish[]`. Today it calls Claude from the browser. Later the same brief goes to your backend, which holds the API key and can cache results across users.

### Data model (core types)

```ts
type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';
type Verdict = 'nah' | 'never' | 'into' | 'super';
type IngredientPref = 'love' | 'meh' | 'never';

interface Dish {
  id: string;                 // hash of normalized recipe URL
  title: string; description: string; meal: Meal;
  recipeUrl: string; sourceName: string; imageUrl: string | null;
  cuisine: string; ideaKey: string; tags: string[]; totalMinutes: number | null;
  ingredients: { name: string; family: string; role: 'main' | 'supporting' }[];
}

interface VerdictEvent {
  id: string; at: string; sessionId: string;
  dishId: string; ideaKey: string; meal: Meal; verdict: Verdict;
  prefsAtTime: Record<string, IngredientPref>;   // families on this dish only
}

interface Session {
  id: string; startedAt: string; lastActiveAt: string;
  mood: { tags: string[]; note: string };
  decks: Record<Meal, { queue: string[]; seen: string[]; hiddenIdeas: string[] }>;
}
```

Dish memory (`nah`/`into`/`super` counts, sessions seen, retired, staple) and the preference map are derived from the event log and cached as snapshots. Storage uses localStorage under versioned keys. Dish records are pruned to those referenced by events, Your list, or live decks, to stay well under browser storage limits. If it outgrows localStorage, IndexedDB slots in behind the same repository.

### AI integration
- **Call shape:** `client.messages.stream(...)` → `finalMessage()` with `claude-opus-5-5`, `output_config.effort: "medium"`, and adaptive thinking.
- **Server tools:** `web_search_20260209` (`max_uses` ≈ 5) and `web_fetch_20260209` (`max_uses` ≈ 10), so the model searches and reads recipe pages itself.
- **Returning results:** the model hands back the batch by calling a strict client tool, `submit_meal_ideas` (`strict: true`, schema = AI-5), instead of using JSON output mode, because JSON output mode can't be combined with the citations that web search produces. Forcing the tool call isn't allowed on this model, so the system prompt tells it to finish by calling `submit_meal_ideas`. The client validates the input with Zod.
- **Stop reasons:**
  - `pause_turn`: the server-side search loop hit its iteration limit. Re-send the conversation to let it continue.
  - `refusal`: retry once, then surface AI-8. Requests also enable the server-side fallback (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`) so a declined request is retried on another model automatically.
  - `max_tokens`: drop that sub-batch and retry.
- **Browser access:** the SDK client is created with `dangerouslyAllowBrowser: true` and the key from Settings. That's acceptable for a personal app. Moving the call behind the backend later removes the key from the device.
- **Caching:** the system prompt and tool definitions stay byte-stable so prompt caching cuts cost on every follow-up batch.
- **Brief:** a compact structured text block (the same idea as the prototype's "What the AI gets" panel) built by `domain/brief.ts`, capped in length by keeping only the most recent and strongest signals.

### Gesture implementation notes
- The card uses Motion's `drag` with `dragElastic`. Release logic reads offset and velocity from `onDragEnd` and applies SW-3 to SW-7.
- Tap versus drag is decided by total movement under 8px.
- The flip is a `rotateY` on an inner wrapper with `backface-visibility: hidden` faces, so the drag transform and the flip don't fight.
- `touch-action: none` on the card plus `overscroll-behavior: none` on the page keeps pull-to-refresh and back-swipe from interfering (MB-3).
- Android vibration uses `navigator.vibrate` when available. iOS Safari has no vibration API, so iPhones get the visual change only.

### Testing
- **Unit (Vitest):** learning rules (LR-1 to LR-10), deck builder (dedupe, Never filtering, the 20% re-show cap, staples), ingredient family matching, brief builder, repository round trips and migrations.
- **E2E (Playwright, iPhone and Pixel viewports):** swipe in every direction, the Never threshold, undo, flip and rating, Refine sheet, meal switching, and persistence across reload. `IdeaSource` is stubbed with fixture batches so tests are fast and free.

### Risks and first spikes
1. **Images.** Web pages fetched by the model may not expose a usable image URL. Spike: run 3 batches and measure how often `imageUrl` loads. If the rate is low, the placeholder (DK-3) carries the MVP, and the backend later scrapes `og:image` reliably.
2. **Latency and cost per batch.** Research with many searches takes tens of seconds. Spike: measure time and tokens per 10-dish sub-batch, then tune `max_uses`, effort, and batch size. Parallel sub-batches (AI-1) hide most of the wait.
3. **Ingredient matching.** "Never mushrooms" has to catch "cremini". The model returns a `family` for each ingredient, and matching runs on family first, with simple plural normalization as a backstop.

### Out of scope for v1
Accounts and sync, the backend itself, sharing lists, shopping lists, nutrition data, and multiple users on one device.

---

## Open questions
1. Is an API key stored in the browser OK until the backend exists?
2. Should Your list be its own screen (as specced) or a tab beside the deck?
3. Mood tiles: is this list of seven right, or do you want different ones?
