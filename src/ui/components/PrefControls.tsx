import type { IngredientPref } from '@/domain/types';
import { PREF_META } from '@/ui/lib/prefMeta';

const ORDER: IngredientPref[] = ['love', 'meh', 'never'];

interface PrefButtonsProps {
  ingredient: string;
  value: IngredientPref | undefined;
  onChange: (pref: IngredientPref | null) => void;
}

/** Three round toggles: Love / Not a fan / Never. Tapping the active one clears it (IN-3). */
export function PrefButtons({ ingredient, value, onChange }: PrefButtonsProps) {
  return (
    <div
      className="flex shrink-0 gap-1.5"
      role="group"
      aria-label={`How you feel about ${ingredient}`}
    >
      {ORDER.map((pref) => {
        const meta = PREF_META[pref];
        const active = value === pref;
        const Icon = meta.icon;
        return (
          <button
            key={pref}
            type="button"
            aria-pressed={active}
            aria-label={`${meta.label}: ${ingredient}`}
            onClick={() => onChange(active ? null : pref)}
            className={`grid size-10 place-items-center rounded-full border transition-all duration-200 active:scale-90 ${
              active ? meta.on : 'border-line-strong bg-transparent text-ink-3 hover:text-ink-2'
            }`}
          >
            <Icon
              className="size-[18px]"
              strokeWidth={2}
              fill={active && pref === 'love' ? 'currentColor' : 'none'}
            />
          </button>
        );
      })}
    </div>
  );
}

interface PrefChipProps {
  label: string;
  pref: IngredientPref;
  onClick: () => void;
  hint?: string;
}

/** A saved preference as a chip; tapping cycles it (RF-6). */
export function PrefChip({ label, pref, onClick, hint }: PrefChipProps) {
  const meta = PREF_META[pref];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${meta.label}. ${hint ?? 'Tap to change.'}`}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-transform active:scale-95 ${meta.chip}`}
    >
      <Icon className="size-3.5 no-underline" strokeWidth={2.25} />
      <span>{label}</span>
    </button>
  );
}
