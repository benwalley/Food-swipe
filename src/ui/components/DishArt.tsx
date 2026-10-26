import { createElement, useEffect, useState } from 'react';
import { tuning } from '@/config/tuning';
import { MEAL_LABELS } from '@/domain/meals';
import type { Dish } from '@/domain/types';
import { iconFor, paletteFor } from '@/ui/lib/art';

interface DishArtProps {
  dish: Dish;
  variant?: 'card' | 'thumb';
}

/**
 * The dish photo when one loads in time, otherwise a designed placeholder:
 * a warm colour field, a food icon, and the cuisine set large in italic
 * serif. The placeholder always renders underneath so nothing ever flashes.
 */
export function DishArt({ dish, variant = 'card' }: DishArtProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>(
    dish.imageUrl ? 'loading' : 'failed',
  );

  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => setStatus('failed'), tuning.image.loadTimeoutMs);
    return () => clearTimeout(timer);
  }, [status]);

  const palette = paletteFor(dish);
  const icon = iconFor(dish);
  const word = dish.cuisine || MEAL_LABELS[dish.meal];

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: palette.bg }}>
      <div className="absolute inset-0" style={{ color: palette.ink }} aria-hidden="true">
        {variant === 'card' ? (
          <>
            <div className="absolute top-1/2 left-1/2 size-[78%] max-h-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-current opacity-15" />
            <div className="absolute top-1/2 left-1/2 size-[58%] max-h-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-current opacity-10" />
            {createElement(icon, {
              strokeWidth: 1,
              className:
                'absolute top-1/2 left-1/2 size-[34%] max-h-[46%] -translate-x-1/2 -translate-y-1/2 opacity-80',
            })}
            <span className="absolute -bottom-[0.22em] left-4 font-display text-[clamp(72px,24vw,128px)] leading-none font-semibold whitespace-nowrap italic opacity-[0.13]">
              {word}
            </span>
          </>
        ) : (
          createElement(icon, {
            strokeWidth: 1.25,
            className:
              'absolute top-1/2 left-1/2 size-1/2 -translate-x-1/2 -translate-y-1/2 opacity-80',
          })
        )}
      </div>
      {dish.imageUrl && status !== 'failed' && (
        <img
          src={dish.imageUrl}
          alt=""
          draggable={false}
          referrerPolicy="no-referrer"
          decoding="async"
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('failed')}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
          style={{ opacity: status === 'loaded' ? 1 : 0 }}
        />
      )}
    </div>
  );
}
