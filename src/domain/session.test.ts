import { describe, expect, it } from 'vitest';
import { createSession, isSessionStale } from './session';

describe('isSessionStale (SE-1)', () => {
  const start = new Date('2026-10-26T12:00:00.000Z');
  const session = createSession('s1', start);

  it('treats a missing session as stale', () => {
    expect(isSessionStale(null, start)).toBe(true);
  });

  it('keeps a session alive within the idle window', () => {
    expect(isSessionStale(session, new Date('2026-10-26T14:59:00.000Z'))).toBe(false);
  });

  it('expires a session after more than three idle hours', () => {
    expect(isSessionStale(session, new Date('2026-10-26T15:00:01.000Z'))).toBe(true);
  });
});
