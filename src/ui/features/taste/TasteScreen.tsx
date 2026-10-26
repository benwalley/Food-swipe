import { ArchiveRestore, Download, Info, RefreshCw, Trash } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { MEAL_LABELS } from '@/domain/meals';
import { useApp, useAppStore, useSourceLabel } from '@/state/hooks';
import { selectMemory } from '@/state/selectors';
import { ConfirmDialog } from '@/ui/components/ConfirmDialog';
import { IngredientPrefsEditor } from './IngredientPrefsEditor';

function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-surface p-5 shadow-float">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[21px] leading-tight font-semibold">{title}</h2>
        {aside && <span className="text-xs text-ink-3">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Row({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mx-2 flex h-12 w-[calc(100%+1rem)] items-center gap-3 rounded-2xl px-2 text-left text-[15px] font-semibold transition-colors hover:bg-surface-2 ${
        danger ? 'text-nope' : 'text-ink'
      }`}
    >
      <span className="grid size-5 place-items-center">{icon}</span>
      {label}
    </button>
  );
}

/** Everything the app has learned, and the controls to change it. */
export function TasteScreen() {
  const store = useAppStore();
  const sourceLabel = useSourceLabel();
  const memorySource = useApp((s) => s.events);
  const saved = useApp((s) => s.saved);
  const restores = useApp((s) => s.restores);
  const dishes = useApp((s) => s.dishes);
  const session = useApp((s) => s.session);
  const [confirmErase, setConfirmErase] = useState(false);

  const retired = useMemo(
    () =>
      [...selectMemory({ events: memorySource, saved, restores }).values()]
        .filter((m) => m.retired && dishes[m.dishId])
        .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
        .map((m) => dishes[m.dishId]!),
    [memorySource, saved, restores, dishes],
  );
  const swipes = memorySource.filter((e) => e.sessionId === session.id).length;
  const started = new Date(session.startedAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  const exportData = async () => {
    const data = await store.getState().exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `food-swipe-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full overflow-y-auto">
      <header className="px-5 pt-safe pb-4">
        <h1 className="font-display text-[34px] leading-tight font-semibold tracking-tight">
          Your taste
        </h1>
        <p className="text-[14px] text-ink-3">What Food Swipe has learned about you.</p>
      </header>

      <div className="flex flex-col gap-4 px-4 pb-8">
        <Section title="Ingredients" aside="All meals">
          <IngredientPrefsEditor grouped />
        </Section>

        <Section title="Retired dishes" aside={retired.length ? `${retired.length}` : undefined}>
          {retired.length === 0 ? (
            <p className="text-[14px] leading-relaxed text-ink-3">
              Dishes you pass on twice, or send away with Never, retire here. You can bring them
              back any time.
            </p>
          ) : (
            <ul className="-my-2 divide-y divide-line">
              {retired.map((dish) => (
                <li key={dish.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">{dish.title}</p>
                    <p className="text-xs text-ink-3">{MEAL_LABELS[dish.meal]}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => store.getState().restoreDish(dish.id)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 text-[13px] font-semibold hover:bg-surface-3"
                  >
                    <ArchiveRestore className="size-4" strokeWidth={2} />
                    Bring back
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="This session" aside={`Since ${started}`}>
          <p className="mb-3 text-[14px] leading-relaxed text-ink-2">
            {swipes} {swipes === 1 ? 'swipe' : 'swipes'} so far. A new session forgets what you’ve
            seen and your mood, and keeps everything you’ve taught it.
          </p>
          <Row
            icon={<RefreshCw className="size-[18px]" strokeWidth={2} />}
            label="Start a new session"
            onClick={() => store.getState().startNewSession()}
          />
        </Section>

        <Section title="Your data" aside="Stored on this device">
          <Row
            icon={<Download className="size-[18px]" strokeWidth={2} />}
            label="Export my data"
            onClick={exportData}
          />
          <Row
            icon={<Info className="size-[18px]" strokeWidth={2} />}
            label="Show the tutorial again"
            onClick={() => store.getState().setOnboarded(false)}
          />
          <Row
            icon={<Trash className="size-[18px]" strokeWidth={2} />}
            label="Erase everything"
            onClick={() => setConfirmErase(true)}
            danger
          />
        </Section>

        <p className="px-2 text-center text-xs leading-relaxed text-ink-3">
          Ideas from {sourceLabel}.
        </p>
      </div>

      <ConfirmDialog
        open={confirmErase}
        title="Erase everything?"
        body="Your list, ingredient preferences, and swipe history will be deleted from this device. This can’t be undone."
        confirmLabel="Erase"
        onCancel={() => setConfirmErase(false)}
        onConfirm={() => {
          setConfirmErase(false);
          void store.getState().eraseEverything();
        }}
      />
    </div>
  );
}
