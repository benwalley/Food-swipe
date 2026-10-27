export const MEALS = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'] as const;
export type Meal = (typeof MEALS)[number];

/** Nah / Into it rate the idea; This one (super) and Never rate the dish. */
export type Verdict = 'nah' | 'never' | 'into' | 'super';
export const POSITIVE_VERDICTS: readonly Verdict[] = ['into', 'super'];

export type IngredientPref = 'love' | 'meh' | 'never';
export type IngredientRole = 'main' | 'supporting';

export const MOOD_TAGS = [
  'quick',
  'cozy',
  'light',
  'adventurous',
  'cheap',
  'crowd-pleaser',
  'healthy',
] as const;
export type MoodTag = (typeof MOOD_TAGS)[number];

export interface Ingredient {
  /** Specific name as written, e.g. "cremini mushrooms". */
  name: string;
  /** General family used for preferences, e.g. "mushrooms". */
  family: string;
  role: IngredientRole;
}

export type PhotoSourceName = 'wikipedia' | 'pexels';

export interface Photo {
  /** Card-sized image, about 960px wide. */
  url: string;
  /** Small image for list thumbnails. */
  thumbUrl: string;
  source: PhotoSourceName;
  /** Photographer or uploader as the source names them; empty when unknown. */
  author: string;
  /** Licence shown in the credit, e.g. "CC BY-SA 4.0"; empty when there isn't one to show. */
  license: string;
  /** Page showing the photo with its author and licence. The credit links here. */
  pageUrl: string;
}

export interface Dish {
  /** Stable hash of the meal and normalized title. */
  id: string;
  title: string;
  description: string;
  meal: Meal;
  /** English Wikipedia article for the dish, used to find its photo. Null when it has none. */
  wikipediaTitle: string | null;
  /** Null when no source had a matching photo; cards then show the illustration. */
  photo: Photo | null;
  cuisine: string;
  /** Slug for the general idea, shared by variations (e.g. "thai-curry"). */
  ideaKey: string;
  tags: string[];
  totalMinutes: number | null;
  ingredients: Ingredient[];
  batchId: string;
  fetchedAt: string;
}

/** One round of idea generation; dishes keep a reference for diagnostics. */
export interface Batch {
  id: string;
  meal: Meal;
  requestedAt: string;
}

export interface VerdictEvent {
  id: string;
  at: string;
  sessionId: string;
  dishId: string;
  ideaKey: string;
  meal: Meal;
  verdict: Verdict;
  /** Preferences for this dish's ingredient families at the time of the verdict. */
  prefsAtTime: Record<string, IngredientPref>;
}

export interface PrefEntry {
  /** Display label, e.g. "Mushrooms". Keyed by canonical family. */
  label: string;
  pref: IngredientPref;
  updatedAt: string;
}
export type IngredientPrefs = Record<string, PrefEntry>;

export interface SavedEntry {
  dishId: string;
  savedAt: string;
}

export interface Mood {
  tags: MoodTag[];
  note: string;
}

export interface MealDeck {
  /** Upcoming dish ids, front first. May contain ids that later become ineligible. */
  queue: string[];
  /** Dish ids decided in this session. */
  seen: string[];
  /** Ideas passed on this session; their dishes are skipped. */
  hiddenIdeas: string[];
  /** Ids that entered the queue as re-shows from earlier sessions. */
  reshows: string[];
  verdictsSinceFetch: number;
}

export interface Session {
  id: string;
  startedAt: string;
  lastActiveAt: string;
  /** Meal on screen, restored when the app reopens within the session. */
  activeMeal: Meal;
  mood: Mood;
  decks: Record<Meal, MealDeck>;
}

/** Everything persisted on the device. The unit a backend would sync. */
export interface TasteData {
  schemaVersion: number;
  events: VerdictEvent[];
  prefs: IngredientPrefs;
  saved: Record<string, SavedEntry>;
  /** Dish id → time the user restored it; earlier verdicts stop counting. */
  restores: Record<string, string>;
  dishes: Record<string, Dish>;
  batches: Record<string, Batch>;
  session: Session | null;
  onboarded: boolean;
}
