import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Unique per control so the sliding pill animates within it. */
  layoutId: string;
  label: string;
  stacked?: boolean;
}

/** Pill-backed segmented control with a sliding selection (radio semantics). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  label,
  stacked = false,
}: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-2xl bg-surface-2 p-1">
      {options.map((option) => {
        const selected = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`relative flex min-h-11 flex-1 items-center justify-center rounded-xl px-1 transition-colors ${
              stacked ? 'flex-col gap-0.5 py-1.5 text-[11px]' : 'gap-1.5 py-2 text-[13px]'
            } font-medium ${selected ? 'text-ink' : 'text-ink-3 hover:text-ink-2'}`}
          >
            {selected && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-xl bg-surface shadow-float"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            {Icon && (
              <Icon
                className={`relative ${stacked ? 'size-[18px]' : 'size-4'}`}
                strokeWidth={1.75}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
