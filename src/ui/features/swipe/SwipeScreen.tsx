import { SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Verdict } from '@/domain/types';
import { useApp, useAppStore } from '@/state/hooks';
import { selectCards } from '@/state/selectors';
import { MealToggle } from '../meal/MealToggle';
import { CoachMarks } from '../onboarding/CoachMarks';
import { RefineSheet } from '../refine/RefineSheet';
import { ActionBar } from './ActionBar';
import { CardStack } from './CardStack';
import type { SwipeCardHandle } from './SwipeCard';

export function SwipeScreen() {
  const store = useAppStore();
  const meal = useApp((s) => s.meal);
  const hasCard = useApp((s) => s.ready && selectCards(s, s.meal).cards.length > 0);
  const canUndo = useApp((s) => s.undoStack.length > 0);
  const moodCount = useApp((s) => s.session.mood.tags.length + (s.session.mood.note ? 1 : 0));
  const showCoach = useApp((s) => s.ready && !s.onboarded);
  const [refineOpen, setRefineOpen] = useState(false);
  const topRef = useRef<SwipeCardHandle>(null);

  const verdict = (v: Verdict) => topRef.current?.fling(v);

  // Desktop keyboard: ← nah (⇧← never), → into it, ↑ this one, space flips, ⌘Z undo.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (refineOpen || showCoach) return;
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, [contenteditable], [role="dialog"]')) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        store.getState().undo();
        return;
      }
      const map: Record<string, Verdict | 'flip'> = {
        ArrowLeft: event.shiftKey ? 'never' : 'nah',
        ArrowRight: 'into',
        ArrowUp: 'super',
        ' ': 'flip',
      };
      const action = map[event.key];
      if (!action || target.closest('button, a')) return;
      event.preventDefault();
      if (action === 'flip') topRef.current?.flip();
      else topRef.current?.fling(action);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [refineOpen, showCoach, store]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between px-5 pt-safe pb-3">
        <h1 className="font-display text-[24px] leading-none font-semibold tracking-tight italic">
          Food Swipe
        </h1>
        <button
          type="button"
          onClick={() => setRefineOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-surface pr-4 pl-3.5 text-[14px] font-semibold text-ink shadow-float transition-transform hover:bg-surface-2 active:scale-95"
        >
          <SlidersHorizontal className="size-4" strokeWidth={2.25} />
          Refine
          {moodCount > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-ink">
              {moodCount}
            </span>
          )}
        </button>
      </header>

      <div className="px-4">
        <MealToggle />
      </div>

      <main className="relative min-h-0 flex-1 px-4 pt-4" aria-live="off">
        <div className="relative mx-auto h-full max-h-[620px] w-full">
          <CardStack key={meal} meal={meal} topRef={topRef} />
          {showCoach && <CoachMarks onDone={() => store.getState().setOnboarded(true)} />}
        </div>
      </main>

      <ActionBar
        enabled={hasCard}
        canUndo={canUndo}
        onVerdict={verdict}
        onUndo={() => store.getState().undo()}
      />

      <RefineSheet open={refineOpen} onClose={() => setRefineOpen(false)} />
    </div>
  );
}
