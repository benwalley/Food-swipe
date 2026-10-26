import {
  Coffee,
  Compass,
  Feather,
  Leaf,
  PiggyBank,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useId, useState } from 'react';
import type { Mood, MoodTag } from '@/domain/types';
import { useApp, useAppStore } from '@/state/hooks';
import { Sheet } from '@/ui/components/Sheet';
import { IngredientPrefsEditor } from '../taste/IngredientPrefsEditor';

const MOODS: { tag: MoodTag; label: string; icon: LucideIcon }[] = [
  { tag: 'quick', label: 'Quick', icon: Zap },
  { tag: 'cozy', label: 'Cozy', icon: Coffee },
  { tag: 'light', label: 'Light', icon: Feather },
  { tag: 'adventurous', label: 'Adventurous', icon: Compass },
  { tag: 'cheap', label: 'Cheap', icon: PiggyBank },
  { tag: 'crowd-pleaser', label: 'Crowd-pleaser', icon: Users },
  { tag: 'healthy', label: 'Healthy', icon: Leaf },
];

const NOTE_MAX = 140;

/**
 * Session mood plus long-term ingredient preferences (spec RF-*). Mood is a
 * draft until the sheet closes, so tapping around doesn't fire requests.
 */
export function RefineSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useAppStore();
  const mood = useApp((s) => s.session.mood);
  const [draft, setDraft] = useState<Mood>(mood);
  const [wasOpen, setWasOpen] = useState(open);
  const noteId = useId();

  // Start each opening from the session's current mood.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(mood);
  }

  const toggle = (tag: MoodTag) =>
    setDraft((d) => ({
      ...d,
      tags: d.tags.includes(tag) ? d.tags.filter((t) => t !== tag) : [...d.tags, tag],
    }));

  const close = () => {
    store.getState().applyMood({ tags: draft.tags, note: draft.note.trim() });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Refine"
      footer={
        <div className="flex flex-col gap-2 pb-1">
          <button
            type="button"
            onClick={close}
            className="h-[52px] rounded-full bg-accent text-[16px] font-semibold text-accent-ink transition-transform active:scale-[0.98]"
          >
            Show me ideas
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              store.getState().startNewSession();
            }}
            className="h-10 text-[14px] font-semibold text-ink-2 hover:text-ink"
          >
            Start a new session
          </button>
        </div>
      }
    >
      <section aria-labelledby="mood-heading" className="pt-1">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 id="mood-heading" className="text-[17px] font-semibold">
            Mood
          </h3>
          <span className="text-xs text-ink-3">Just this session</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MOODS.map(({ tag, label, icon: Icon }) => {
            const on = draft.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(tag)}
                className={`flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 text-[13px] font-semibold transition-all duration-150 active:scale-95 ${
                  on
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line-strong text-ink-2 hover:bg-surface-2'
                }`}
              >
                <Icon className="size-[22px]" strokeWidth={1.75} />
                {label}
              </button>
            );
          })}
        </div>
        <label htmlFor={noteId} className="mt-4 mb-1.5 block text-[13px] font-semibold">
          Tell the chef
        </label>
        <div className="relative">
          <textarea
            id={noteId}
            rows={2}
            maxLength={NOTE_MAX}
            value={draft.note}
            onChange={(event) => setDraft((d) => ({ ...d, note: event.target.value }))}
            placeholder="No seafood this week"
            className="w-full resize-none rounded-2xl border border-line-strong bg-surface px-4 py-3 text-[15px] outline-none placeholder:text-ink-3 focus:border-accent"
          />
          <span className="absolute right-3 bottom-2 text-[11px] text-ink-3 tabular-nums">
            {draft.note.length}/{NOTE_MAX}
          </span>
        </div>
      </section>

      <section aria-labelledby="ingredients-heading" className="mt-7">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 id="ingredients-heading" className="text-[17px] font-semibold">
            Ingredients
          </h3>
          <span className="text-xs text-ink-3">Kept for good</span>
        </div>
        <IngredientPrefsEditor />
      </section>
    </Sheet>
  );
}
