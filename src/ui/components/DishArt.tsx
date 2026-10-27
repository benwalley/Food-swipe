import { createElement, useEffect, useState } from 'react';
import { tuning } from '@/config/tuning';
import { MEAL_LABELS } from '@/domain/meals';
import type { Dish, Photo } from '@/domain/types';
import { isHttpsUrl } from '@/lib/url';
import { iconFor, paletteFor } from '@/ui/lib/art';
import { PhotoCredit } from './PhotoCredit';

interface DishArtProps {
  dish: Dish;
  variant?: 'card' | 'thumb';
  /** Shows the photo's credit over it once it has loaded. */
  credit?: boolean;
}

/**
 * The dish photo when one loads in time, otherwise a designed placeholder:
 * a warm colour field, a food icon, and the cuisine set large in italic
 * serif. The placeholder always renders underneath so nothing ever flashes.
 */
export function DishArt({ dish, variant = 'card', credit = false }: DishArtProps) {
  const palette = paletteFor(dish);
  const icon = iconFor(dish);
  const word = dish.cuisine || MEAL_LABELS[dish.meal];
  const src = dish.photo && (variant === 'thumb' ? dish.photo.thumbUrl : dish.photo.url);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: palette.bg }}>
      {/* Size containment lets the rings use the shorter side, so they stay circles at any aspect. */}
      <div
        className="[container-type:size] absolute inset-0"
        style={{ color: palette.ink }}
        aria-hidden="true"
      >
        {variant === 'card' ? (
          <>
            <div className="absolute top-1/2 left-1/2 size-[min(78cqw,88cqh)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-current opacity-15" />
            <div className="absolute top-1/2 left-1/2 size-[min(58cqw,66cqh)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-current opacity-10" />
            {createElement(icon, {
              strokeWidth: 1,
              className:
                'absolute top-1/2 left-1/2 size-[min(34cqw,40cqh)] -translate-x-1/2 -translate-y-1/2 opacity-80',
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
      {/* Keyed by address, so a dish that gains a photo later starts loading it fresh. */}
      {dish.photo && src && isHttpsUrl(src) && (
        <DishPhoto key={src} src={src} photo={dish.photo} credit={credit} />
      )}
    </div>
  );
}

function DishPhoto({ src, photo, credit }: { src: string; photo: Photo; credit: boolean }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');

  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => setStatus('failed'), tuning.photos.loadTimeoutMs);
    return () => clearTimeout(timer);
  }, [status]);

  if (status === 'failed') return null;
  return (
    <>
      <img
        src={src}
        alt=""
        draggable={false}
        referrerPolicy="no-referrer"
        decoding="async"
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('failed')}
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
        style={{ opacity: status === 'loaded' ? 1 : 0 }}
      />
      {credit && status === 'loaded' && (
        // Sits level with the card's round flip button, leaving it room on the right.
        <PhotoCredit photo={photo} className="absolute bottom-5 left-3 max-w-[calc(100%-5rem)]" />
      )}
    </>
  );
}
