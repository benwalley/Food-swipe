import { tuning as defaultTuning, type Tuning } from '@/config/tuning';
import type { DishMemory } from './memory';
import type { Dish, IngredientPrefs, Meal, Mood, SavedEntry, Session, VerdictEvent } from './types';

/** Everything the idea source needs to find the next batch (spec AI-3). */
export interface Brief {
  meal: Meal;
  count: number;
  /** A theme for initial batches; null for personalized follow-ups. */
  angle: string | null;
  /** Share of results that should stay close to known likes; null when there's nothing to go on. */
  exploitShare: number | null;
  mood: Mood;
  intoIdeas: string[];
  savedDishes: string[];
  passedIdeas: string[];
  loves: string[];
  goEasyOn: string[];
  nevers: string[];
  staples: string[];
  avoidTitles: string[];
  month: string;
}

interface BriefInput {
  meal: Meal;
  count: number;
  angle: string | null;
  now: Date;
  session: Session;
  events: readonly VerdictEvent[];
  dishes: Readonly<Record<string, Dish>>;
  prefs: IngredientPrefs;
  saved: Readonly<Record<string, SavedEntry>>;
  memory: ReadonlyMap<string, DishMemory>;
}

function describe(dish: Dish): string {
  return dish.cuisine ? `${dish.title} (${dish.cuisine})` : dish.title;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function buildBrief(input: BriefInput, t: Tuning = defaultTuning): Brief {
  const { meal, session, dishes, prefs, memory } = input;
  const max = t.brief.maxSignals;
  const recentFirst = [...input.events]
    .filter((e) => e.meal === meal)
    .sort((a, b) => b.at.localeCompare(a.at));

  const titlesFor = (verdicts: string[]) =>
    unique(
      recentFirst
        .filter((e) => verdicts.includes(e.verdict))
        .flatMap((e) => (dishes[e.dishId] ? [describe(dishes[e.dishId]!)] : [])),
    ).slice(0, max);

  const intoIdeas = titlesFor(['into', 'super']);
  const passedIdeas = titlesFor(['nah']);
  const savedDishes = Object.values(input.saved)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    .flatMap((s) => (dishes[s.dishId]?.meal === meal ? [dishes[s.dishId]!.title] : []))
    .slice(0, max);

  const prefLabels = (pref: string) =>
    Object.values(prefs)
      .filter((p) => p.pref === pref)
      .map((p) => p.label.toLowerCase());

  const mealMemories = [...memory.values()].filter((m) => dishes[m.dishId]?.meal === meal);
  const staples = mealMemories
    .filter((m) => m.staple)
    .map((m) => dishes[m.dishId]!.title)
    .slice(0, max);
  const retired = mealMemories.filter((m) => m.retired).map((m) => dishes[m.dishId]!.title);

  const deck = session.decks[meal];
  const sessionTitles = [...deck.seen, ...deck.queue].flatMap((id) =>
    dishes[id] ? [dishes[id]!.title] : [],
  );
  const avoidTitles = unique([...sessionTitles, ...retired]).slice(0, t.brief.maxAvoidTitles);

  const hasSignals = intoIdeas.length + savedDishes.length > 0;
  return {
    meal,
    count: input.count,
    angle: input.angle,
    exploitShare: input.angle === null && hasSignals ? t.batches.exploitShare : null,
    mood: session.mood,
    intoIdeas,
    savedDishes,
    passedIdeas,
    loves: prefLabels('love'),
    goEasyOn: prefLabels('meh'),
    nevers: prefLabels('never'),
    staples,
    avoidTitles,
    month: input.now.toLocaleString('en-US', { month: 'long' }),
  };
}

/** Renders a brief as plain prompt text. Empty sections are omitted. */
export function renderBrief(brief: Brief): string {
  const lines: string[] = [`Find ${brief.count} ${brief.meal} ideas.`];
  if (brief.angle) lines.push(`Theme for this batch: ${brief.angle}.`);
  const moodParts = [
    brief.mood.tags.length ? brief.mood.tags.join(', ') : '',
    brief.mood.note ? `note from the user: "${brief.mood.note}"` : '',
  ].filter(Boolean);
  if (moodParts.length) lines.push(`Mood for this session: ${moodParts.join('; ')}.`);
  const list = (label: string, values: string[]) => {
    if (values.length) lines.push(`${label}: ${values.join('; ')}.`);
  };
  list('They are into ideas like', brief.intoIdeas);
  list('They saved these exact dishes', brief.savedDishes);
  list('Staples they keep coming back to', brief.staples);
  list('They passed on ideas like', brief.passedIdeas);
  list('Ingredients they love', brief.loves);
  list('Go easy on these (avoid as a main ingredient)', brief.goEasyOn);
  list('Never include these ingredients', brief.nevers);
  if (brief.exploitShare !== null) {
    const close = Math.round(brief.exploitShare * 100);
    lines.push(
      `Mix: about ${close}% close to what they're into, ${100 - close}% new directions they haven't seen.`,
    );
  }
  list("Don't suggest these, they've already seen them", brief.avoidTitles);
  lines.push(`Current month: ${brief.month}.`);
  return lines.join('\n');
}
