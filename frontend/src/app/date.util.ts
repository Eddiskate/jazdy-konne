export function startOfWeek(date: Date): Date {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDayHeading(date: Date): string {
  return date.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'short' });
}

export function formatWeekRange(from: Date, to: Date): string {
  const start = from.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
  const end = to.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${start} – ${end}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Warsaw',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Warsaw',
  });
}

export function slotDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Europe/Warsaw' });
}
