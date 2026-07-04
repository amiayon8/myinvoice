export function calculateNextGenDate(dateStr: string, frequency: string): string {
  if (!dateStr) return '';
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';

  let year = parseInt(match[1], 10);
  let month = parseInt(match[2], 10) - 1; // 0-indexed month
  let day = parseInt(match[3], 10);

  const freq = (frequency || 'monthly').toLowerCase();

  if (freq === 'weekly') {
    const date = new Date(Date.UTC(year, month, day));
    date.setUTCDate(date.getUTCDate() + 7);
    year = date.getUTCFullYear();
    month = date.getUTCMonth();
    day = date.getUTCDate();
  } else if (freq === 'monthly') {
    const date = new Date(Date.UTC(year, month, day));
    date.setUTCMonth(date.getUTCMonth() + 1);
    year = date.getUTCFullYear();
    month = date.getUTCMonth();
    day = date.getUTCDate();
  } else if (freq === 'quarterly') {
    const date = new Date(Date.UTC(year, month, day));
    date.setUTCMonth(date.getUTCMonth() + 3);
    year = date.getUTCFullYear();
    month = date.getUTCMonth();
    day = date.getUTCDate();
  } else if (freq === 'annually' || freq === 'yearly') {
    const date = new Date(Date.UTC(year, month, day));
    date.setUTCFullYear(date.getUTCFullYear() + 1);
    year = date.getUTCFullYear();
    month = date.getUTCMonth();
    day = date.getUTCDate();
  } else {
    // default to monthly
    const date = new Date(Date.UTC(year, month, day));
    date.setUTCMonth(date.getUTCMonth() + 1);
    year = date.getUTCFullYear();
    month = date.getUTCMonth();
    day = date.getUTCDate();
  }

  const yyyy = String(year).padStart(4, '0');
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}
