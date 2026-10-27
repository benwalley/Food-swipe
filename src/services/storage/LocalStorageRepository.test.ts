import { beforeEach, describe, expect, it } from 'vitest';
import { createSession } from '@/domain/session';
import type { Dish } from '@/domain/types';
import { makeDish, makeEvent, pref } from '@/test/factories';
import { LocalStorageRepository } from './LocalStorageRepository';

describe('LocalStorageRepository', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips every collection through storage', async () => {
    const repo = new LocalStorageRepository(localStorage, 'test');
    await repo.load();
    const dish = makeDish({ id: 'd1' });
    const session = createSession('s1', new Date('2026-10-26T00:00:00.000Z'));
    await repo.appendEvent(makeEvent('d1', 'into', 's1', '2026-10-26T00:00:00.000Z'));
    await repo.setPref('mushroom', pref('Mushrooms', 'never'));
    await repo.setSaved('d1', { dishId: 'd1', savedAt: '2026-10-26T00:00:00.000Z' });
    await repo.putDishes([dish], [{ id: 'batch-1', meal: 'dinner', requestedAt: 'x' }]);
    await repo.setSession(session);
    await repo.setOnboarded(true);
    await repo.flush();

    const reloaded = await new LocalStorageRepository(localStorage, 'test').load();
    expect(reloaded.events).toHaveLength(1);
    expect(reloaded.prefs.mushroom?.pref).toBe('never');
    expect(reloaded.saved.d1?.dishId).toBe('d1');
    expect(reloaded.dishes.d1?.title).toBe(dish.title);
    expect(reloaded.batches['batch-1']?.meal).toBe('dinner');
    expect(reloaded.session?.id).toBe('s1');
    expect(reloaded.onboarded).toBe(true);
  });

  it('quarantines a corrupt collection instead of crashing (PS-2)', async () => {
    localStorage.setItem('test:v1:prefs', '{"mushroom": {"pref": "hate"}}');
    const data = await new LocalStorageRepository(localStorage, 'test').load();
    expect(data.prefs).toEqual({});
    const backups = Object.keys(localStorage).filter((k) => k.startsWith('test:v1:prefs:corrupt:'));
    expect(backups).toHaveLength(1);
  });

  it('loads dishes saved before photos existed, without a photo', async () => {
    const older: Partial<Dish> & { imageUrl: null } = {
      ...makeDish({ id: 'old' }),
      imageUrl: null,
    };
    delete older.wikipediaTitle;
    delete older.photo;
    localStorage.setItem('test:v1:dishes', JSON.stringify({ old: older }));
    const data = await new LocalStorageRepository(localStorage, 'test').load();
    expect(data.dishes.old).toMatchObject({ id: 'old', wikipediaTitle: null, photo: null });
    expect(data.dishes.old).not.toHaveProperty('imageUrl');
  });

  it('keeps a dish photo and its credit', async () => {
    const repo = new LocalStorageRepository(localStorage, 'test');
    await repo.load();
    const photo = {
      url: 'https://example.org/960px-a.jpg',
      thumbUrl: 'https://example.org/330px-a.jpg',
      source: 'wikipedia' as const,
      author: 'Calliopejen1',
      license: 'CC BY-SA 3.0',
      pageUrl: 'https://en.wikipedia.org/wiki/File:A.jpg',
    };
    await repo.putDishes([makeDish({ id: 'd1', wikipediaTitle: 'Shakshouka', photo })], []);
    await repo.flush();
    const data = await new LocalStorageRepository(localStorage, 'test').load();
    expect(data.dishes.d1).toMatchObject({ wikipediaTitle: 'Shakshouka', photo });
  });

  it('prunes unreferenced dishes and their batches', async () => {
    const repo = new LocalStorageRepository(localStorage, 'test');
    await repo.load();
    await repo.putDishes(
      [makeDish({ id: 'keep', batchId: 'b1' }), makeDish({ id: 'drop', batchId: 'b2' })],
      [
        { id: 'b1', meal: 'dinner', requestedAt: 'x' },
        { id: 'b2', meal: 'dinner', requestedAt: 'x' },
      ],
    );
    await repo.pruneDishes(new Set(['keep']));
    const data = await repo.exportAll();
    expect(Object.keys(data.dishes)).toEqual(['keep']);
    expect(Object.keys(data.batches)).toEqual(['b1']);
  });

  it('clears only its own keys', async () => {
    localStorage.setItem('other-app', 'x');
    const repo = new LocalStorageRepository(localStorage, 'test');
    await repo.load();
    await repo.setOnboarded(true);
    await repo.flush();
    await repo.clear();
    expect(localStorage.getItem('other-app')).toBe('x');
    expect(Object.keys(localStorage).some((k) => k.startsWith('test:'))).toBe(false);
  });
});
