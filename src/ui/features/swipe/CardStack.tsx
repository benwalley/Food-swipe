import { useMotionValue } from 'motion/react';
import { useCallback, type Ref } from 'react';
import { memoryLine } from '@/domain/memory';
import type { Meal, Verdict } from '@/domain/types';
import { useApp, useAppStore } from '@/state/hooks';
import { selectCards, selectMemory } from '@/state/selectors';
import { SwipeCard, type SwipeCardHandle } from './SwipeCard';
import { EmptyCard, ErrorCard, LoadingCard, SkeletonCard } from './StatusCard';

interface CardStackProps {
  meal: Meal;
  topRef: Ref<SwipeCardHandle>;
}

/** The top card, the one behind it, or a status card when there are none. */
export function CardStack({ meal, topRef }: CardStackProps) {
  const store = useAppStore();
  const ready = useApp((s) => s.ready);
  // Select a primitive key so the component only re-renders when the visible cards change.
  const ids = useApp((s) =>
    selectCards(s, meal)
      .cards.map((d) => d.id)
      .join('|'),
  );
  const dishes = useApp((s) => s.dishes);
  const fetch = useApp((s) => s.fetch[meal]);
  const returning = useApp((s) => s.returning);
  const sessionId = useApp((s) => s.session.id);
  const saved = useApp((s) => s.saved);
  const memory = useApp((s) => selectMemory(s));
  const keySource = useApp((s) => s.keySource);
  const progress = useMotionValue(0);

  const onDecide = useCallback(
    (dishId: string, verdict: Verdict) => store.getState().decide(dishId, verdict),
    [store],
  );

  if (!ready) return <SkeletonCard />;

  const cards = ids ? ids.split('|').flatMap((id) => (dishes[id] ? [dishes[id]!] : [])) : [];
  if (cards.length === 0) {
    if (fetch.inFlight > 0) return <LoadingCard meal={meal} />;
    if (fetch.error)
      return (
        <ErrorCard
          kind={fetch.error.kind}
          onRetry={() => store.getState().retry(meal)}
          onSaveKey={keySource ? (key) => store.getState().setApiKey(key) : undefined}
        />
      );
    return <EmptyCard meal={meal} onMore={() => store.getState().retry(meal)} />;
  }

  // Render back-to-front; keys keep the behind card's instance when it's promoted.
  return (
    <>
      {[...cards].reverse().map((dish) => {
        const isTop = dish.id === cards[0]!.id;
        return (
          <SwipeCard
            key={dish.id}
            ref={isTop ? topRef : undefined}
            dish={dish}
            memory={memoryLine(memory.get(dish.id), Boolean(saved[dish.id]), sessionId)}
            isTop={isTop}
            progress={progress}
            returningFrom={isTop && returning?.dishId === dish.id ? returning.verdict : null}
            onDecide={(verdict) => onDecide(dish.id, verdict)}
          />
        );
      })}
    </>
  );
}
