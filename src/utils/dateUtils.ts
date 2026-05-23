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
