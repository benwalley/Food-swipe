import { Heart, Star, Undo2, X } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { tuning } from '@/config/tuning';
import type { Verdict } from '@/domain/types';
import { tick } from '@/ui/lib/haptics';

interface ActionBarProps {
  enabled: boolean;
  canUndo: boolean;
  onVerdict: (verdict: Verdict) => void;
  onUndo: () => void;
}

function RoundButton({
  size,
  label,
  className,
  disabled,
  onClick,
  children,
}: {
  size: number;
  label: string;
  className: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      style={{ width: size, height: size }}
      className={`grid shrink-0 place-items-center rounded-full bg-surface shadow-float transition-[transform,opacity] duration-150 active:scale-90 disabled:opacity-40 disabled:active:scale-100 ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Button equivalents of every swipe (spec SW-8). Holding Nah records Never,
 * with a ring that fills while you hold.
 */
export function ActionBar({ enabled, canUndo, onVerdict, onUndo }: ActionBarProps) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedNever = useRef(false);

  const startHold = () => {
    if (!enabled) return;
    firedNever.current = false;
    setHolding(true);
    timer.current = setTimeout(() => {
      firedNever.current = true;
      setHolding(false);
      tick(18);
      onVerdict('never');
    }, tuning.swipe.longPressMs);
  };

  const endHold = (commit: boolean) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
    if (commit && !firedNever.current && enabled) onVerdict('nah');
  };

  return (
    <div className="flex items-center justify-center gap-5 px-6 pt-3 pb-4">
      <RoundButton
        size={44}
        label="Undo"
        disabled={!canUndo}
        onClick={onUndo}
        className="text-ink-2"
      >
        <Undo2 className="size-5" strokeWidth={2} />
      </RoundButton>

      <button
        type="button"
        aria-label="Nah, not this idea. Hold for never."
        disabled={!enabled}
        onPointerDown={startHold}
        onPointerUp={() => endHold(true)}
        onPointerLeave={() => endHold(false)}
        onPointerCancel={() => endHold(false)}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (enabled) onVerdict(event.shiftKey ? 'never' : 'nah');
          }
        }}
        className="relative grid size-16 shrink-0 touch-none place-items-center rounded-full bg-surface text-nope shadow-float transition-[transform,opacity] duration-150 active:scale-90 disabled:opacity-40"
      >
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
          <circle
            cx="32"
            cy="32"
            r="30"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={188.5}
            strokeDashoffset={holding ? 0 : 188.5}
            style={{
              transition: holding
                ? `stroke-dashoffset ${tuning.swipe.longPressMs}ms linear`
                : 'none',
              opacity: holding ? 1 : 0,
            }}
          />
        </svg>
        <X className="size-7" strokeWidth={2.5} />
      </button>

      <RoundButton
        size={50}
        label="This one: save this exact dish"
        disabled={!enabled}
        onClick={() => onVerdict('super')}
        className="text-super"
      >
        <Star className="size-[22px]" strokeWidth={2.25} fill="currentColor" />
      </RoundButton>

      <RoundButton
        size={64}
        label="Into it: more ideas like this"
        disabled={!enabled}
        onClick={() => onVerdict('into')}
        className="text-like"
      >
        <Heart className="size-7" strokeWidth={2.25} fill="currentColor" />
      </RoundButton>
    </div>
  );
}
