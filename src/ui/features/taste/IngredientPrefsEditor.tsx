import { Plus } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { nextPrefInCycle } from '@/domain/ingredients';
import type { IngredientPref } from '@/domain/types';
import { useApp, useAppStore } from '@/state/hooks';
import { PrefChip } from '@/ui/components/PrefControls';

const GROUPS: { pref: IngredientPref; title: string }[] = [
  { pref: 'love', title: 'Love' },
  { pref: 'meh', title: 'Not a fan' },
  { pref: 'never', title: 'Never' },
];

/**
 * Every saved ingredient preference as chips that cycle when tapped, plus a
 * field to add one directly (spec RF-6, RF-7).
 */
export function IngredientPrefsEditor({ grouped = false }: { grouped?: boolean }) {
  const prefs = useApp((s) => s.prefs);
  const store = useAppStore();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const inputId = useId();
  const errorId = useId();

  const entries = Object.values(prefs).sort((a, b) => a.label.localeCompare(b.label));
  const cycle = (label: string, pref: IngredientPref) =>
    store.getState().setPref(label, nextPrefInCycle(pref));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = draft.trim();
    if (!value) {
      setError('Type an ingredient first');
      return;
    }
    store.getState().setPref(value, 'meh');
    setDraft('');
  };

  const chips = (list: typeof entries) => (
    <div className="flex flex-wrap gap-2">
      {list.map((entry) => (
        <PrefChip
          key={entry.label}
          label={entry.label}
          pref={entry.pref}
          onClick={() => cycle(entry.label, entry.pref)}
        />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {entries.length === 0 ? (
        <p className="text-[14px] leading-relaxed text-ink-3">
          Nothing yet. Flip a card to rate its ingredients, or add one here.
        </p>
      ) : grouped ? (
        GROUPS.map(({ pref, title }) => {
          const list = entries.filter((e) => e.pref === pref);
          if (list.length === 0) return null;
          return (
            <div key={pref}>
              <p className="mb-2 smallcaps text-ink-3">{title}</p>
              {chips(list)}
            </div>
          );
        })
      ) : (
        chips(entries)
      )}

      <form onSubmit={submit} noValidate>
        <label htmlFor={inputId} className="sr-only">
          Add an ingredient to avoid
        </label>
        <div className="flex gap-2">
          <input
            id={inputId}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              if (error) setError('');
            }}
            placeholder="Cilantro"
            autoComplete="off"
            enterKeyHint="done"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className="h-11 min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-4 text-[15px] outline-none placeholder:text-ink-3 focus:border-accent"
          />
          <button
            type="submit"
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-surface-2 px-4 text-[14px] font-semibold hover:bg-surface-3"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            Avoid
          </button>
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 pl-4 text-[13px] text-nope">
            {error}
          </p>
        )}
      </form>
      {entries.length > 0 && (
        <p className="-mt-2 text-xs text-ink-3">
          Tap a chip to cycle love, not a fan, never, and clear.
        </p>
      )}
    </div>
  );
}
