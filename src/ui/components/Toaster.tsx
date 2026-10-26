import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { SavedEntry } from '@/domain/types';
import { useAppStore, useNotifier } from '@/state/hooks';
import { noticeText, type ToastContent } from '@/ui/lib/noticeText';

interface Toast extends ToastContent {
  id: number;
  entry?: SavedEntry;
}

const TONE_DOT: Record<NonNullable<ToastContent['tone']>, string> = {
  default: 'bg-ink-3',
  like: 'bg-like',
  nope: 'bg-nope',
  super: 'bg-super',
};

/** Shows one notice at a time near the top, with an optional undo action. */
export function Toaster() {
  const notifier = useNotifier();
  const store = useAppStore();
  const [toast, setToast] = useState<Toast | null>(null);
  const seq = useRef(0);

  useEffect(
    () =>
      notifier.subscribe((notice) => {
        const content = noticeText(notice);
        if (!content) return;
        seq.current += 1;
        setToast({
          ...content,
          id: seq.current,
          entry: notice.kind === 'unsaved' ? notice.entry : undefined,
        });
      }),
    [notifier],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.action ? 4200 : 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  const runAction = () => {
    if (!toast) return;
    if (toast.action === 'undo') store.getState().undo();
    if (toast.action === 'resave' && toast.entry) store.getState().resave(toast.entry);
    setToast(null);
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[max(env(safe-area-inset-top),0.75rem)]"
      aria-live="polite"
      role="status"
    >
      <AnimatePresence mode="popLayout">
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
            className="pointer-events-auto flex max-w-[440px] items-center gap-3 rounded-full bg-ink py-2.5 pr-2.5 pl-4 text-sm font-medium text-bg shadow-float"
          >
            <span className={`size-2 shrink-0 rounded-full ${TONE_DOT[toast.tone ?? 'default']}`} />
            <span className="min-w-0 py-0.5">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={runAction}
                className="rounded-full px-3 py-1 text-sm font-semibold text-bg/90 underline-offset-2 hover:bg-bg/10"
              >
                Undo
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
