// Parse 'YYYY-MM-DD' at local noon so no timezone can push it onto a neighbouring day.
export const toDate = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00`);

// Local calendar date as 'YYYY-MM-DD' (toISOString would shift to UTC).
export function toISODate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(d: string, days: number) {
  const date = toDate(d);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function formatWindow(t: { start_date: string; end_date: string; flexible_days: number }) {
  const fmt = (d: string) => toDate(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const flex = t.flexible_days ? ` · ±${t.flexible_days} day${t.flexible_days === 1 ? '' : 's'}` : '';
  return `${fmt(t.start_date)} – ${fmt(t.end_date)}${flex}`;
}

export function formatWeekday(d: string) {
  return toDate(d).toLocaleDateString(undefined, { weekday: 'short' });
}

export function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}
