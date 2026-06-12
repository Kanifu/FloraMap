import { Plant, MaintenanceTaskType } from '@/models';

const TASK_LABELS: Record<MaintenanceTaskType, string> = {
  water: 'Begieten',
  prune: 'Snoeien',
  fertilize: 'Bemesten',
  repot: 'Verpotten',
  treat: 'Behandelen',
};

const toICSDate = (iso: string): string => iso.slice(0, 10).replace(/-/g, '');

/** RFC 5545 DTEND for VALUE=DATE is exclusive — add one day to DTSTART. */
const nextICSDate = (icsDate: string): string => {
  const year = Number(icsDate.slice(0, 4));
  const month = Number(icsDate.slice(4, 6)) - 1;
  const day = Number(icsDate.slice(6, 8));
  const d = new Date(Date.UTC(year, month, day));
  d.setUTCDate(d.getUTCDate() + 1);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
};

const toICSDateTime = (d: Date): string =>
  `${d.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;

/** Escape TEXT values per RFC 5545 §3.3.11. */
const escapeICSText = (text: string): string =>
  text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

export function generateICS(plants: Plant[]): string {
  const events: string[] = [];
  const dtstamp = toICSDateTime(new Date());

  for (const plant of plants) {
    for (const task of plant.maintenanceTasks) {
      if (task.completedDate) continue;
      const dateStr = toICSDate(task.dueDate);
      const summary = `${plant.commonName} — ${TASK_LABELS[task.type]}`;
      events.push(
        [
          'BEGIN:VEVENT',
          `UID:floramap-${plant.id}-${task.id}@floramap`,
          `DTSTAMP:${dtstamp}`,
          `DTSTART;VALUE=DATE:${dateStr}`,
          `DTEND;VALUE=DATE:${nextICSDate(dateStr)}`,
          `SUMMARY:${escapeICSText(summary)}`,
          task.notes ? `DESCRIPTION:${escapeICSText(task.notes)}` : '',
          'END:VEVENT',
        ]
          .filter(Boolean)
          .join('\r\n'),
      );
    }
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FloraMap//NL',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:FloraMap Tuin',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}
