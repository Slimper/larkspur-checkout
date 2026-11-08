import { describe, expect, it } from 'vitest';
import { parsePagination, toPage } from '../src/lib/pagination';

describe('parsePagination', () => {
  it('uses the defaults when nothing is given', () => {
    expect(parsePagination({})).toEqual({ limit: 20, offset: 0 });
  });

  it('clamps limit to 1..100', () => {
    expect(parsePagination({ limit: '0' }).limit).toBe(1);
    expect(parsePagination({ limit: '35' }).limit).toBe(35);
    expect(parsePagination({ limit: '500' }).limit).toBe(100);
  });

  it('falls back to the default limit for non-numeric input', () => {
    expect(parsePagination({ limit: 'all' }).limit).toBe(20);
    expect(parsePagination({ limit: ['10', '20'] }).limit).toBe(20);
  });

  it('never returns a negative offset', () => {
    expect(parsePagination({ offset: '-5' }).offset).toBe(0);
    expect(parsePagination({ offset: '40' }).offset).toBe(40);
  });

  it('derives the offset from page', () => {
    expect(parsePagination({ page: '3', limit: '10' })).toEqual({ limit: 10, offset: 30 });
  });

  it('prefers page over offset', () => {
    expect(parsePagination({ page: '2', offset: '5' }).offset).toBe(40);
  });
});

describe('toPage', () => {
  it('reports hasMore only when the extra row came back', () => {
    expect(toPage([1, 2, 3], 2)).toEqual({ items: [1, 2], hasMore: true });
    expect(toPage([1, 2], 2)).toEqual({ items: [1, 2], hasMore: false });
  });
});
