import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
  type PanInfo,
} from 'motion/react';
import { useImperativeHandle, useLayoutEffect, useRef, useState, type Ref } from 'react';
import { tuning } from '@/config/tuning';
import type { MemoryLine } from '@/domain/memory';
import type { Dish, Verdict } from '@/domain/types';
import { tick } from '@/ui/lib/haptics';
import { CardBack, CardFront } from './CardFace';
import { Stamp } from './Stamp';

export interface SwipeCardHandle {
  fling: (verdict: Verdict) => void;
  flip: () => void;
}

interface SwipeCardProps {
  dish: Dish;
  memory: MemoryLine | null;
  isTop: boolean;
  /** Shared 0→1 drag progress so the card behind can grow into place. */
  progress: MotionValue<number>;
  /** When set, the card animates back in from where that verdict sent it. */
  returningFrom: Verdict | null;
  onDecide: (verdict: Verdict) => void;
  ref?: Ref<SwipeCardHandle>;
}

const S = tuning.swipe;
const CLAMP = (value: number) => Math.max(0, Math.min(1, value));

function exitTarget(verdict: Verdict, vw: number, vh: number) {
  if (verdict === 'super') return { x: 0, y: -vh * 1.1 };
  const dir = verdict === 'into' ? 1 : -1;
  return { x: dir * vw * 1.3, y: 60 };
}

export function SwipeCard({
  dish,
  memory,
  isTop,
  progress,
  returningFrom,
  onDecide,
  ref,
}: SwipeCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-320, 0, 320], [-13, 0, 13]);
  const behindScale = useTransform(progress, [0, 1], [0.94, 1]);
  const behindY = useTransform(progress, [0, 1], [24, 0]);
  const dragControls = useDragControls();
  const reduced = useReducedMotion();

  const [flipped, setFlipped] = useState(false);
  const [neverArmed, setNeverArmed] = useState(false);
  const [forced, setForced] = useState<Verdict | null>(null);
  const decided = useRef(false);
  const tap = useRef<{ x: number; y: number; t: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const dims = useRef({ w: 360, h: 540, vw: 390, vh: 844 });

  const isUp = () => -y.get() > Math.abs(x.get());
  const intoOpacity = useTransform(() => (isUp() ? 0 : CLAMP(x.get() / 110)));
  const nahOpacity = useTransform(() => (isUp() ? 0 : CLAMP(-x.get() / 110)));
  const superOpacity = useTransform(() => (isUp() ? CLAMP(-y.get() / 120) : 0));

  const measure = () => {
    const rect = cardRef.current?.getBoundingClientRect();
    dims.current = {
      w: rect?.width ?? dims.current.w,
      h: rect?.height ?? dims.current.h,
      vw: window.innerWidth,
      vh: window.innerHeight,
    };
  };

  // Drag distance feeds the card behind; crossing the Never line arms it (SW-5, SW-6).
  const armedRef = useRef(false);
  const onMove = () => {
    if (!isTop) return;
    progress.set(CLAMP(Math.hypot(x.get(), y.get()) / 200));
    const armed = x.get() < -S.neverX * dims.current.vw;
    if (armed !== armedRef.current) {
      armedRef.current = armed;
      setNeverArmed(armed);
      if (armed) tick(14);
    }
  };
  useMotionValueEvent(x, 'change', onMove);
  useMotionValueEvent(y, 'change', onMove);

  useLayoutEffect(() => {
    if (!isTop) return;
    progress.set(0);
    if (!returningFrom) return;
    measure();
    const from = exitTarget(returningFrom, dims.current.vw, dims.current.vh);
    x.set(from.x);
    y.set(from.y);
    animate(x, 0, { type: 'spring', stiffness: 260, damping: 28 });
    animate(y, 0, { type: 'spring', stiffness: 260, damping: 28 });
  }, [isTop, returningFrom, progress, x, y]);

  const fling = (verdict: Verdict) => {
    if (decided.current || !isTop) return;
    decided.current = true;
    measure();
    setForced(verdict);
    tick(verdict === 'never' ? 18 : 8);
    if (reduced) {
      onDecide(verdict);
      return;
    }
    const target = exitTarget(verdict, dims.current.vw, dims.current.vh);
    const options = { type: 'tween' as const, duration: 0.32, ease: [0.4, 0, 0.7, 0.2] as const };
    void Promise.all([animate(x, target.x, options), animate(y, target.y, options)]).then(() =>
      onDecide(verdict),
    );
  };

  const flip = () => {
    if (!decided.current) setFlipped((value) => !value);
  };

  useImperativeHandle(ref, () => ({ fling, flip }));

  const onDragEnd = (_: PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    const { w, h, vw } = dims.current;
    const up = -offset.y > Math.abs(offset.x);
    if (offset.x < -S.neverX * vw) return fling('never');
    if (up && (-offset.y > h * S.commitUp || -velocity.y > S.flickVelocity)) return fling('super');
    if (!up && (offset.x > w * S.commitX || (velocity.x > S.flickVelocity && offset.x > 0)))
      return fling('into');
    if (!up && (offset.x < -w * S.commitX || (velocity.x < -S.flickVelocity && offset.x < 0)))
      return fling('nah');
    const spring = { type: 'spring' as const, stiffness: 420, damping: 30 };
    animate(x, 0, spring);
    animate(y, 0, spring);
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (!isTop || decided.current) return;
    if ((event.target as HTMLElement).closest('[data-no-drag]')) return;
    measure();
    tap.current = { x: event.clientX, y: event.clientY, t: performance.now() };
    dragControls.start(event);
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const start = tap.current;
    tap.current = null;
    if (!start || decided.current) return;
    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (moved < S.tapSlop && performance.now() - start.t < 500) flip();
  };

  const showNever = neverArmed || forced === 'never';
  const stampOpacity = (verdict: Verdict, live: MotionValue<number>) =>
    forced ? (forced === verdict || (verdict === 'nah' && forced === 'never') ? 1 : 0) : live;

  return (
    <motion.div
      ref={cardRef}
      className="absolute inset-0 touch-none select-none"
      style={
        isTop
          ? { x, y, rotate, zIndex: 2, cursor: 'grab' }
          : { scale: behindScale, y: behindY, zIndex: 1, pointerEvents: 'none' }
      }
      initial={isTop ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      drag={isTop}
      dragListener={false}
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={1}
      onDragEnd={onDragEnd}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      aria-hidden={!isTop}
      role={isTop ? 'group' : undefined}
      aria-roledescription={isTop ? 'meal idea' : undefined}
      aria-label={isTop ? `${dish.title}. ${dish.description}` : undefined}
    >
      <div className="relative h-full w-full [perspective:1600px]">
        <motion.div
          className="relative h-full w-full [transform-style:preserve-3d]"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 26 }}
        >
          <div
            className="absolute inset-0 overflow-hidden rounded-[28px] bg-surface shadow-card [backface-visibility:hidden]"
            aria-hidden={flipped}
          >
            <CardFront dish={dish} memory={memory} onFlip={flip} />
          </div>
          <div
            className="absolute inset-0 [transform:rotateY(180deg)] overflow-hidden rounded-[28px] bg-surface shadow-card [backface-visibility:hidden]"
            aria-hidden={!flipped}
          >
            {(flipped || isTop) && <CardBack dish={dish} onFlip={flip} />}
          </div>
        </motion.div>

        {isTop && (
          <>
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-10 rounded-[28px] bg-nope"
              animate={{ opacity: showNever ? 0.22 : 0 }}
              transition={{ duration: 0.15 }}
            />
            <Stamp
              label="Into it"
              tone="like"
              opacity={stampOpacity('into', intoOpacity)}
              rotate={-14}
              className="top-7 left-6"
            />
            <Stamp
              label={showNever ? 'Never' : 'Nah'}
              tone="nope"
              opacity={stampOpacity('nah', nahOpacity)}
              rotate={14}
              className="top-7 right-6"
            />
            <Stamp
              label="This one!"
              tone="super"
              opacity={stampOpacity('super', superOpacity)}
              rotate={-6}
              className="bottom-[46%] left-1/2 -translate-x-1/2"
            />
          </>
        )}
      </div>
    </motion.div>
  );
}
