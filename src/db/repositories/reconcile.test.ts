import { describe, expect, it } from 'vitest';
import { reconcileIds } from './reconcile';

describe('reconcileIds', () => {
  it('adds ids that are wanted but not present', () => {
    expect(reconcileIds([], ['a', 'b'])).toEqual({ toAdd: ['a', 'b'], toRemove: [] });
  });

  it('removes ids that are present but no longer wanted', () => {
    expect(reconcileIds(['a', 'b'], [])).toEqual({ toAdd: [], toRemove: ['a', 'b'] });
  });

  it('leaves unchanged ids out of both lists', () => {
    const { toAdd, toRemove } = reconcileIds(['a', 'b'], ['b', 'c']);
    expect(toAdd).toEqual(['c']);
    expect(toRemove).toEqual(['a']);
  });

  it('is a no-op when sets are equal regardless of order', () => {
    expect(reconcileIds(['a', 'b', 'c'], ['c', 'b', 'a'])).toEqual({ toAdd: [], toRemove: [] });
  });

  it('dedupes repeated wanted ids', () => {
    expect(reconcileIds([], ['a', 'a', 'b'])).toEqual({ toAdd: ['a', 'b'], toRemove: [] });
  });
});
