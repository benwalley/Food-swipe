import type { Notice } from '@/state/notices';

export interface ToastContent {
  message: string;
  action?: 'undo' | 'resave';
  tone?: 'default' | 'like' | 'nope' | 'super';
}

/** All user-facing wording for store notices lives here. */
export function noticeText(notice: Notice): ToastContent | null {
  switch (notice.kind) {
    case 'saved':
      return { message: 'Saved to your list', tone: 'super' };
    case 'never-dish':
      return { message: "Won't show this again", action: 'undo', tone: 'nope' };
    case 'pref': {
      const name = notice.label.toLowerCase();
      if (notice.pref === 'love') return { message: `Love ${name}, noted`, tone: 'like' };
      if (notice.pref === 'meh') return { message: `Less ${name} from now on` };
      if (notice.pref === 'never') {
        const extra = notice.skipped ? ` · ${notice.skipped} skipped` : '';
        return { message: `No more ${name}, anywhere${extra}`, tone: 'nope' };
      }
      return { message: `${notice.label} reset` };
    }
    case 'skipped-never':
      return {
        message: `Skipped ${notice.count} ${notice.count === 1 ? 'dish' : 'dishes'} with ingredients you never want`,
      };
    case 'unsaved':
      return { message: 'Removed from your list', action: 'resave' };
    case 'restored':
      return { message: `${notice.title} can show up again` };
    case 'session-started':
      return {
        message: notice.retired
          ? `Fresh session · retired ${notice.retired} ${notice.retired === 1 ? 'dish' : 'dishes'}`
          : 'Fresh session started',
      };
    case 'refine-applied':
      return { message: 'Finding ideas for your mood…' };
    case 'nothing-to-undo':
      return { message: 'Nothing to undo' };
    case 'key-saved':
      return { message: 'Key saved in this browser', tone: 'like' };
    case 'key-removed':
      return { message: 'Key removed from this browser' };
  }
}
