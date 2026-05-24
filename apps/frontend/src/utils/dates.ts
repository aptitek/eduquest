const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getFullDateLabel(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
  }).format(date);
}

export function getHumanizedDateLabel(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const days = Math.round((target.getTime() - today.getTime()) / DAY_MS);
  const absoluteDays = Math.abs(days);

  if (absoluteDays < 7) {
    return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(days, 'day');
  }

  const weeks = Math.round(days / 7);
  const absoluteWeeks = Math.abs(weeks);
  if (absoluteWeeks < 5) {
    return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(weeks, 'week');
  }

  const now = new Date();
  const months = (date.getFullYear() - now.getFullYear()) * 12 + (date.getMonth() - now.getMonth());
  const absoluteMonths = Math.abs(months);

  if (absoluteMonths < 12) {
    return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(months, 'month');
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(date);
}
