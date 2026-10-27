import { motion } from 'motion/react';
import { ChefHat, CircleAlert, CookingPot, KeyRound, RefreshCw, WifiOff } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { MEAL_LABELS } from '@/domain/meals';
import type { Meal } from '@/domain/types';
import type { IdeaErrorKind } from '@/services/ideas/IdeaSource';
import { ApiKeyForm } from '@/ui/features/key/ApiKeyForm';

function Shell({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute inset-0 overflow-y-auto rounded-[28px] bg-surface shadow-card"
    >
      {/* Centred when it fits; scrolls when the keyboard squeezes the card. */}
      <div className="flex min-h-full flex-col items-center justify-center px-8 py-8 text-center">
        {children}
      </div>
    </motion.div>
  );
}

const LOADING_LINES = (meal: string) => [
  `Thinking up ${meal} ideas`,
  'Reading your taste',
  'Checking ingredients against your nevers',
  'Plating up the first cards',
];

/** Shown while the first ideas for a meal are on their way (spec AI-7). */
export function LoadingCard({ meal }: { meal: Meal }) {
  const lines = LOADING_LINES(MEAL_LABELS[meal].toLowerCase());
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % lines.length), 2600);
    return () => clearInterval(timer);
  }, [lines.length]);

  return (
    <Shell>
      <div className="relative mb-6">
        <div className="grid size-24 place-items-center rounded-full bg-accent-soft">
          <CookingPot className="size-11 text-accent" strokeWidth={1.5} />
        </div>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute top-1 h-5 w-1 rounded-full bg-accent/40"
            style={{ left: `${38 + i * 12}%` }}
            animate={{ y: [-2, -14], opacity: [0, 0.9, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.35, ease: 'easeOut' }}
          />
        ))}
      </div>
      <h2 className="font-display text-[26px] leading-tight font-semibold">Cooking up ideas</h2>
      <motion.p
        key={index}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 min-h-[2.75rem] text-[15px] leading-snug text-ink-2"
      >
        {lines[index]}…
      </motion.p>
      <p className="mt-6 text-xs text-ink-3">The first ideas take about 10 seconds.</p>
    </Shell>
  );
}

const ERROR_COPY: Record<IdeaErrorKind, { title: string; body: string; icon: typeof CircleAlert }> =
  {
    config: {
      title: 'Add your Gemini key',
      body: 'Food Swipe asks Google’s Gemini for ideas. Your key stays in this browser and only goes to Google.',
      icon: KeyRound,
    },
    auth: {
      title: 'Gemini rejected the key',
      body: 'Check that you copied the whole key, then paste it again.',
      icon: KeyRound,
    },
    quota: {
      title: 'Gemini needs a breather',
      body: "You've hit a rate limit or quota. Try again in a minute.",
      icon: CircleAlert,
    },
    network: {
      title: "Couldn't reach Gemini",
      body: 'Check your connection and try again.',
      icon: WifiOff,
    },
    'invalid-output': {
      title: "Couldn't load ideas",
      body: 'The ideas came back in a shape the app could not use. Try again.',
      icon: CircleAlert,
    },
    unknown: {
      title: "Couldn't load ideas",
      body: 'Something went wrong. Try again.',
      icon: CircleAlert,
    },
  };

interface ErrorCardProps {
  kind: IdeaErrorKind;
  onRetry: () => void;
  /** Offered instead of a retry when the problem is a missing or rejected key. */
  onSaveKey?: (key: string) => void;
}

/** Spec AI-8 and ST-2: explains what went wrong and offers a way forward. */
export function ErrorCard({ kind, onRetry, onSaveKey }: ErrorCardProps) {
  const copy = ERROR_COPY[kind];
  const Icon = copy.icon;
  const askForKey = onSaveKey && (kind === 'config' || kind === 'auth');
  return (
    <Shell>
      <div className="mb-5 grid size-20 place-items-center rounded-full bg-nope-soft">
        <Icon className="size-9 text-nope" strokeWidth={1.6} />
      </div>
      <h2 className="font-display text-[24px] leading-tight font-semibold">{copy.title}</h2>
      <p className="mt-2 text-[15px] leading-snug text-ink-2">{copy.body}</p>
      {askForKey ? (
        <div className="mt-6 w-full">
          <ApiKeyForm onSave={onSaveKey} />
          {import.meta.env.DEV && (
            <p className="mt-3 text-xs text-ink-3">
              Or set VITE_GEMINI_API_KEY in .env.local and restart the dev server.
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[15px] font-semibold text-bg transition-transform active:scale-95"
        >
          <RefreshCw className="size-4" strokeWidth={2.25} />
          Try again
        </button>
      )}
    </Shell>
  );
}

/** Nothing left to show and nothing loading. */
export function EmptyCard({ meal, onMore }: { meal: Meal; onMore: () => void }) {
  return (
    <Shell>
      <div className="mb-5 grid size-20 place-items-center rounded-full bg-like-soft">
        <ChefHat className="size-9 text-like" strokeWidth={1.6} />
      </div>
      <h2 className="font-display text-[24px] leading-tight font-semibold">
        That's every {MEAL_LABELS[meal].toLowerCase()} idea for now
      </h2>
      <p className="mt-2 text-[15px] leading-snug text-ink-2">
        Want another round based on what you've liked?
      </p>
      <button
        type="button"
        onClick={onMore}
        className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[15px] font-semibold text-bg transition-transform active:scale-95"
      >
        <RefreshCw className="size-4" strokeWidth={2.25} />
        Find more ideas
      </button>
    </Shell>
  );
}

export function SkeletonCard() {
  return <div className="absolute inset-0 animate-pulse rounded-[28px] bg-surface shadow-card" />;
}
