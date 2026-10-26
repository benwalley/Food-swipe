import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Hand, Heart, RotateCcw, Star, X, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

interface Step {
  title: string;
  body: string;
  icon: LucideIcon;
  tone: string;
  gesture: { x: number[]; y: number[] } | 'tap';
}

const STEPS: Step[] = [
  {
    title: 'Swipe right if you’re into it',
    body: 'You like the idea, so you’ll see more like it.',
    icon: Heart,
    tone: 'text-like bg-like-soft',
    gesture: { x: [0, 70, 70, 0], y: [0, 0, 0, 0] },
  },
  {
    title: 'Swipe left for nah',
    body: 'Not feeling it. Drag all the way across and that dish is gone for good.',
    icon: X,
    tone: 'text-nope bg-nope-soft',
    gesture: { x: [0, -70, -70, 0], y: [0, 0, 0, 0] },
  },
  {
    title: 'Swipe up for this one',
    body: 'Want this exact dish? It goes straight to your list.',
    icon: Star,
    tone: 'text-super bg-super-soft',
    gesture: { x: [0, 0, 0, 0], y: [0, -60, -60, 0] },
  },
  {
    title: 'Tap to flip the card',
    body: 'Rate the ingredients on the back, like no mushrooms, ever.',
    icon: RotateCcw,
    tone: 'text-accent bg-accent-soft',
    gesture: 'tap',
  },
];

/** First-run walkthrough of the four gestures (spec MB-5). */
export function CoachMarks({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  const step = STEPS[index]!;
  const last = index === STEPS.length - 1;
  const Icon = step.icon;

  return (
    <motion.div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-[28px] bg-bg/80 px-6 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="dialog"
      aria-modal="true"
      aria-label="How to use Food Swipe"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col items-center text-center"
        >
          <div className="relative mb-8 grid h-36 w-36 place-items-center">
            <div className={`grid size-24 place-items-center rounded-full ${step.tone}`}>
              <Icon className="size-10" strokeWidth={1.75} />
            </div>
            <motion.div
              className="absolute right-0 bottom-0 text-ink"
              animate={
                reduced
                  ? undefined
                  : step.gesture === 'tap'
                    ? { scale: [1, 0.82, 1, 1] }
                    : { x: step.gesture.x, y: step.gesture.y }
              }
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: 'easeInOut',
                times: [0, 0.45, 0.7, 1],
              }}
            >
              <Hand className="size-10 drop-shadow" strokeWidth={1.5} fill="var(--c-surface)" />
            </motion.div>
          </div>
          <h2 className="font-display text-[28px] leading-tight font-semibold text-balance">
            {step.title}
          </h2>
          <p className="mt-3 max-w-[300px] text-[16px] leading-relaxed text-ink-2">{step.body}</p>
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex gap-2" aria-hidden="true">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-accent' : 'w-1.5 bg-line-strong'}`}
          />
        ))}
      </div>
      <div className="mt-8 flex w-full max-w-[300px] gap-3">
        {!last && (
          <button
            type="button"
            onClick={onDone}
            className="h-12 flex-1 rounded-full text-[15px] font-semibold text-ink-2"
          >
            Skip
          </button>
        )}
        <button
          type="button"
          onClick={() => (last ? onDone() : setIndex(index + 1))}
          className="h-12 flex-1 rounded-full bg-accent text-[15px] font-semibold text-accent-ink transition-transform active:scale-95"
        >
          {last ? 'Let’s eat' : 'Next'}
        </button>
      </div>
    </motion.div>
  );
}
