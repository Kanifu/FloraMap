import { Garden, Plant, MaintenanceTask, MaintenanceTaskType } from '@/models';

const TASK_LABELS: Record<MaintenanceTaskType, string> = {
  water: 'Begieten', prune: 'Snoeien', fertilize: 'Bemesten', repot: 'Verpotten', treat: 'Behandelen',
};

const TASK_ICONS: Record<MaintenanceTaskType, string> = {
  water: '💧', prune: '✂️', fertilize: '🌱', repot: '🪴', treat: '🩹',
};

const formatDate = (iso?: string): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
};

const escapHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const plantRows = (plants: Plant[]): string =>
  plants.map((p) => {
    const tasks = p.maintenanceTasks.filter((t) => !t.completedDate);
    const nextTask = tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
    return `
    <tr>
      <td><strong>${escapHtml(p.commonName)}</strong></td>
      <td><em>${escapHtml(p.species)}</em></td>
      <td>${formatDate(p.plantedDate)}</td>
      <td>${nextTask ? `${TASK_ICONS[nextTask.type]} ${TASK_LABELS[nextTask.type]} — ${formatDate(nextTask.dueDate)}` : '✅ Geen taken'}</td>
    </tr>`;
  }).join('');

const taskRows = (garden: Garden): string => {
  const now = new Date().toISOString();
  const rows: { plant: Plant; task: MaintenanceTask }[] = [];
  for (const plant of garden.plants) {
    for (const task of plant.maintenanceTasks) {
      if (!task.completedDate) rows.push({ plant, task });
    }
  }
  rows.sort((a, b) => a.task.dueDate.localeCompare(b.task.dueDate));
  return rows.slice(0, 30).map(({ plant, task }) => {
    const isOverdue = task.dueDate < now;
    return `
    <tr${isOverdue ? ' class="overdue"' : ''}>
      <td>${TASK_ICONS[task.type]} ${TASK_LABELS[task.type]}</td>
      <td>${escapHtml(plant.commonName)}</td>
      <td>${formatDate(task.dueDate)}${isOverdue ? ' ⚠️' : ''}</td>
      <td>${task.notes ? escapHtml(task.notes) : '—'}</td>
    </tr>`;
  }).join('');
};

export const generateGardenHTML = (garden: Garden, appVersion: string): string => {
  const exportDate = new Date().toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const openTasks = garden.plants.reduce((n, p) => n + p.maintenanceTasks.filter((t) => !t.completedDate).length, 0);

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FloraMap — ${escapHtml(garden.name)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 24px; line-height: 1.5; }
    h1 { font-size: 24px; color: #1b4332; margin-bottom: 4px; }
    h2 { font-size: 16px; color: #2d6a4f; margin: 24px 0 10px; border-bottom: 2px solid #b7e4c7; padding-bottom: 4px; }
    .meta { font-size: 12px; color: #6b705c; margin-bottom: 4px; }
    .stats { display: flex; gap: 16px; background: #f1f8f3; border-radius: 8px; padding: 12px 16px; margin: 16px 0; }
    .stat { text-align: center; }
    .stat strong { display: block; font-size: 20px; color: #1b4332; }
    .stat span { font-size: 11px; color: #6b705c; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th { background: #d8f3dc; color: #1b4332; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 10px; text-align: left; }
    td { padding: 8px 10px; border-bottom: 1px solid #e9ecef; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    tr.overdue td { background: #fff5f5; color: #e63946; }
    tr:nth-child(even) td { background: #f8f9fa; }
    tr.overdue:nth-child(even) td { background: #ffe8ea; }
    .footer { margin-top: 32px; font-size: 11px; color: #aaa; text-align: center; border-top: 1px solid #e9ecef; padding-top: 12px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>🌿 FloraMap — ${escapHtml(garden.name)}</h1>
  <p class="meta">Geëxporteerd op ${exportDate} · Versie ${appVersion}</p>

  <div class="stats">
    <div class="stat"><strong>${garden.plants.length}</strong><span>Planten</span></div>
    <div class="stat"><strong>${openTasks}</strong><span>Open taken</span></div>
    <div class="stat"><strong>${garden.soilProfiles?.length ?? 0}</strong><span>Bodemprofielen</span></div>
    <div class="stat"><strong>${(garden.tasks ?? []).filter((t) => !t.completedDate).length}</strong><span>Tuintaken</span></div>
  </div>

  <h2>🌱 Planten (${garden.plants.length})</h2>
  ${garden.plants.length === 0 ? '<p style="color:#aaa">Nog geen planten toegevoegd.</p>' : `
  <table>
    <thead><tr><th>Naam</th><th>Soort</th><th>Geplant</th><th>Volgende taak</th></tr></thead>
    <tbody>${plantRows(garden.plants)}</tbody>
  </table>`}

  <h2>📋 Open taken (max. 30)</h2>
  ${openTasks === 0 ? '<p style="color:#aaa">Geen open taken. Super! ✅</p>' : `
  <table>
    <thead><tr><th>Taak</th><th>Plant</th><th>Datum</th><th>Notitie</th></tr></thead>
    <tbody>${taskRows(garden)}</tbody>
  </table>`}

  ${(garden.soilProfiles?.length ?? 0) > 0 ? `
  <h2>🧪 Bodemprofielen</h2>
  <table>
    <thead><tr><th>Zone</th><th>pH</th><th>Bodemtype</th><th>Getest</th><th>Toevoegingen</th></tr></thead>
    <tbody>
    ${garden.soilProfiles!.map((sp) => `
      <tr>
        <td><strong>${escapHtml(sp.zoneName)}</strong></td>
        <td>${sp.ph?.toFixed(1) ?? '—'}</td>
        <td>${sp.soilType ?? '—'}</td>
        <td>${formatDate(sp.lastTestedDate)}</td>
        <td>${sp.amendments.length > 0 ? sp.amendments.slice(-2).map((a) => escapHtml(a.type)).join(', ') : '—'}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  <div class="footer">FloraMap v${appVersion} · Jouw slimme tuinplanner</div>
</body>
</html>`;
};
