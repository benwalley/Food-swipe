import { motion } from 'motion/react';
import { Bookmark, ChefHat, Layers, type LucideIcon } from 'lucide-react';
import type { Tab } from '@/app/useTab';

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'swipe', label: 'Swipe', icon: Layers },
  { id: 'list', label: 'Your list', icon: Bookmark },
  { id: 'taste', label: 'Taste', icon: ChefHat },
];

export function TabBar({
  tab,
  onChange,
  savedCount,
}: {
  tab: Tab;
  onChange: (tab: Tab) => void;
  savedCount: number;
}) {
  return (
    <nav aria-label="Sections" className="border-t border-line bg-bg/90 pb-safe backdrop-blur-md">
      <ul className="mx-auto flex max-w-[480px] px-3 pt-1.5">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <li key={id} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex h-14 w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold tracking-wide transition-colors ${
                  active ? 'text-accent' : 'text-ink-3 hover:text-ink-2'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="tab-indicator"
                    className="absolute top-0 h-[3px] w-8 rounded-full bg-accent"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <span className="relative">
                  <Icon className="size-[22px]" strokeWidth={active ? 2.1 : 1.75} />
                  {id === 'list' && savedCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] leading-none font-bold text-accent-ink">
                      {savedCount > 99 ? '99+' : savedCount}
                    </span>
                  )}
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
