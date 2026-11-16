// Tjedan traje od ponedjeljka do nedjelje, po lokalnom vremenu uređaja.

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Lokalni datum u obliku YYYY-MM-DD. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Ponedjeljak u 00:00 (lokalno) za tjedan u kojem je `ts`. */
export function weekStart(ts: number): Date {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0 = nedjelja
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Ključ tjedna = datum ponedjeljka (YYYY-MM-DD). */
export function weekKey(ts: number): string {
  return dayKey(weekStart(ts).getTime());
}

/** Ključ prethodnog tjedna. */
export function previousWeekKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 7);
  return dayKey(date.getTime());
}
