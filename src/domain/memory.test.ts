import { describe, expect, it } from 'vitest';
import { makeEvent } from '@/test/factories';
import { buildMemory, memoryLine } from './memory';

const day = (n: number) => `2026-10-${String(n).padStart(2, '0')}T12:00:00.000Z`;

describe('buildMemory', () => {
  it('retires a dish passed in two sessions with no likes (LR-3)', () => {
    const events = [makeEvent('a', 'nah', 's1', day(1)), makeEvent('a', 'nah', 's2', day(2))];
    expect(buildMemory({ events, saved: {}, restores: {} }).get('a')?.retired).toBe(true);
  });

  it('does not retire after one Nah (LR-2)', () => {
    const events = [makeEvent('a', 'nah', 's1', day(1))];
    expect(buildMemory({ events, saved: {}, restores: {} }).get('a')?.retired).toBe(false);
  });

  it('retires immediately on Never (LR-4)', () => {
    const events = [makeEvent('a', 'into', 's1', day(1)), makeEvent('a', 'never', 's2', day(2))];
    expect(buildMemory({ events, saved: {}, restores: {} }).get('a')?.retired).toBe(true);
  });

  it('never retires a liked or saved dish through Nahs (LR-8)', () => {
    const liked = [
      makeEvent('a', 'into', 's1', day(1)),
      makeEvent('a', 'nah', 's2', day(2)),
      makeEvent('a', 'nah', 's3', day(3)),
    ];
    expect(buildMemory({ events: liked, saved: {}, restores: {} }).get('a')?.retired).toBe(false);
    const nahs = [makeEvent('b', 'nah', 's1', day(1)), makeEvent('b', 'nah', 's2', day(2))];
    const saved = { b: { dishId: 'b', savedAt: day(1) } };
    expect(buildMemory({ events: nahs, saved, restores: {} }).get('b')?.retired).toBe(false);
  });

  it('makes a staple after likes in two sessions, and a Nah resets it (LR-6)', () => {
    const events = [makeEvent('a', 'into', 's1', day(1)), makeEvent('a', 'super', 's2', day(2))];
    expect(buildMemory({ events, saved: {}, restores: {} }).get('a')?.staple).toBe(true);
    const withNah = [...events, makeEvent('a', 'nah', 's3', day(3))];
    expect(buildMemory({ events: withNah, saved: {}, restores: {} }).get('a')?.staple).toBe(false);
  });

  it('ignores verdicts from before a restore', () => {
    const events = [makeEvent('a', 'never', 's1', day(1))];
    const memory = buildMemory({ events, saved: {}, restores: { a: day(2) } });
    expect(memory.has('a')).toBe(false);
  });

  it('is independent of event order', () => {
    const events = [makeEvent('a', 'nah', 's3', day(3)), makeEvent('a', 'into', 's1', day(1))];
    const m = buildMemory({ events, saved: {}, restores: {} }).get('a')!;
    expect(m.lastVerdict).toBe('nah');
    expect(m.likedSessionsSinceNah).toBe(0);
  });
});

describe('memoryLine', () => {
  const memory = buildMemory({
    events: [makeEvent('a', 'nah', 's1', day(1))],
    saved: {},
    restores: {},
  });

  it('describes a dish passed in an earlier session', () => {
    expect(memoryLine(memory.get('a'), false, 's2')).toEqual({ kind: 'passed', lastChance: true });
  });

  it('says nothing during the session the verdict happened in', () => {
    expect(memoryLine(memory.get('a'), false, 's1')).toBeNull();
  });
});
