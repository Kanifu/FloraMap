import { relativeDueLabel } from '@/utils/dateUtils';

describe('relativeDueLabel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockNow = (iso: string) => {
    jest.setSystemTime(new Date(iso));
  };

  it('returns "Vandaag" for a task due today, regardless of UTC time-of-day', () => {
    mockNow('2026-06-15T08:00:00Z');
    expect(relativeDueLabel('2026-06-15T02:00:00Z')).toBe('Vandaag');
  });

  it('returns "Morgen" for a task due tomorrow', () => {
    mockNow('2026-06-15T08:00:00Z');
    expect(relativeDueLabel('2026-06-16T23:00:00Z')).toBe('Morgen');
  });

  it('returns "Gisteren" for a task due yesterday', () => {
    mockNow('2026-06-15T08:00:00Z');
    expect(relativeDueLabel('2026-06-14T00:00:00Z')).toBe('Gisteren');
  });

  it('is not affected by the early/late-UTC edge cases (#130)', () => {
    // A due date stored as an early- or late-UTC timestamp should still be
    // treated as that calendar date, regardless of the user's local
    // timezone offset.
    mockNow('2026-06-15T08:00:00Z');
    expect(relativeDueLabel('2026-06-15T02:00:00Z')).toBe('Vandaag');
    expect(relativeDueLabel('2026-06-15T23:59:00Z')).toBe('Vandaag');
  });

  it('returns "Overmorgen" and "Over X dagen" for further future dates', () => {
    mockNow('2026-06-15T08:00:00Z');
    expect(relativeDueLabel('2026-06-17T12:00:00Z')).toBe('Overmorgen');
    expect(relativeDueLabel('2026-06-20T12:00:00Z')).toBe('Over 5 dagen');
  });

  it('returns "X dagen geleden" for older overdue dates', () => {
    mockNow('2026-06-15T08:00:00Z');
    expect(relativeDueLabel('2026-06-10T12:00:00Z')).toBe('5 dagen geleden');
  });
});
