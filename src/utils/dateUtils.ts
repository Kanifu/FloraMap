/**
 * Shared date helpers used across MaintenanceScreen and PlantCardScreen.
 */

/**
 * Returns a human-readable relative label for a dueDate ISO string.
 * e.g. "Vandaag", "Morgen", "Over 5 dagen", "Gisteren", "3 dagen geleden"
 */
export const relativeDueLabel = (dueDateStr: string): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'Vandaag';
  if (diff === 1) return 'Morgen';
  if (diff === 2) return 'Overmorgen';
  if (diff > 0) return `Over ${diff} dagen`;
  if (diff === -1) return 'Gisteren';
  return `${Math.abs(diff)} dagen geleden`;
};

/**
 * Returns an ISO timestamp anchored at local noon on the given date's calendar day.
 * Anchoring at noon keeps the intended due-date stable when the value is later
 * read back on a device in a different timezone (see issue #130) — local
 * `setHours(0,0,0,0)` round-trips back to the same calendar day for any
 * realistic timezone offset.
 */
export const toLocalNoonISO = (date: Date): string => {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
};

/** ISO timestamp for "today + days", anchored at local noon. */
export const addDaysISO = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toLocalNoonISO(d);
};

/** Short date format used as secondary label, e.g. "26 mei" */
export const shortDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });

/** Full date+time, e.g. "26 mei om 09:14" */
export const fullDateTime = (iso: string): string => {
  const d = new Date(iso);
  const date = d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  return `${date} om ${time}`;
};
