const DAYS = ['ned', 'pon', 'uto', 'sri', 'čet', 'pet', 'sub'];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** npr. „pon 17.11.2026.“ */
export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${DAYS[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}.`;
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Trajanje u obliku „1 h 05 min“ ili „42 min“. */
export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} h ${pad(m)} min` : `${m} min`;
}

/** Odbrojavanje u obliku „1:05“. */
export function formatClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}
