import { Plant, MaintenanceTaskType } from '@/models';

const TASK_LABELS: Record<MaintenanceTaskType, string> = {
  water: 'Begieten',
  prune: 'Snoeien',
  fertilize: 'Bemesten',
  repot: 'Verpotten',
  treat: 'Behandelen',
};

const toICSDate = (iso: string): string => iso.slice(0, 10).replace(/-/g, '');

export function generateICS(plants: Plant[]): string {
  const events: string[] = [];

  for (const plant of plants) {
    for (const task of plant.maintenanceTasks) {
      if (task.completedDate) continue;
      const dateStr = toICSDate(task.dueDate);
      events.push(
        [
          'BEGIN:VEVENT',
          `UID:floramap-${plant.id}-${task.id}@floramap`,
          `DTSTART;VALUE=DATE:${dateStr}`,
          `DTEND;VALUE=DATE:${dateStr}`,
          `SUMMARY:${plant.commonName} — ${TASK_LABELS[task.type]}`,
          task.notes ? `DESCRIPTION:${task.notes}` : '',
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
