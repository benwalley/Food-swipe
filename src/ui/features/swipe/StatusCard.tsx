import { motion } from 'motion/react';
import { ChefHat, CircleAlert, CookingPot, KeyRound, RefreshCw, WifiOff } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { MEAL_LABELS } from '@/domain/meals';
import type { Meal } from '@/domain/types';
import type { IdeaErrorKind } from '@/services/ideas/IdeaSource';

function Shell({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[28px] bg-surface px-8 text-center shadow-card"
    >
      {children}
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
      body: 'Paste your key after VITE_GEMINI_API_KEY= in .env.local, then restart the dev server.',
      icon: KeyRound,
    },
    auth: {
      title: 'Gemini rejected the key',
      body: 'Check VITE_GEMINI_API_KEY in .env.local, then restart the dev server.',
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

/** Spec AI-8 and ST-2: explains what went wrong and offers a retry. */
export function ErrorCard({ kind, onRetry }: { kind: IdeaErrorKind; onRetry: () => void }) {
  const copy = ERROR_COPY[kind];
  const Icon = copy.icon;
  return (
    <Shell>
      <div className="mb-5 grid size-20 place-items-center rounded-full bg-nope-soft">
        <Icon className="size-9 text-nope" strokeWidth={1.6} />
      </div>
      <h2 className="font-display text-[24px] leading-tight font-semibold">{copy.title}</h2>
      <p className="mt-2 text-[15px] leading-snug text-ink-2">{copy.body}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[15px] font-semibold text-bg transition-transform active:scale-95"
      >
        <RefreshCw className="size-4" strokeWidth={2.25} />
        Try again
      </button>
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
