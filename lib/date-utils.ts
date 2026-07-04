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

export function getPeriodDate(dateStr: string, frequency: string, timing: 'advanced' | 'after_period'): string {
  if (timing === 'advanced') {
    return dateStr;
  }
  if (!dateStr) return '';
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';

  let year = parseInt(match[1], 10);
  let month = parseInt(match[2], 10) - 1; // 0-indexed month
  let day = parseInt(match[3], 10);

  const freq = (frequency || 'monthly').toLowerCase();
  const date = new Date(Date.UTC(year, month, day));

  if (freq === 'weekly') {
    date.setUTCDate(date.getUTCDate() - 7);
  } else if (freq === 'monthly') {
    date.setUTCMonth(date.getUTCMonth() - 1);
  } else if (freq === 'quarterly') {
    date.setUTCMonth(date.getUTCMonth() - 3);
  } else if (freq === 'annually' || freq === 'yearly') {
    date.setUTCFullYear(date.getUTCFullYear() - 1);
  } else {
    date.setUTCMonth(date.getUTCMonth() - 1);
  }

  year = date.getUTCFullYear();
  month = date.getUTCMonth();
  day = date.getUTCDate();

  const yyyy = String(year).padStart(4, '0');
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

export function parseBillingTiming(notes: string | null | undefined): 'advanced' | 'after_period' {
  if (!notes) return 'advanced';
  if (notes.includes('<!-- billing_timing: after_period -->') || notes.includes('[Billing: After Period]') || notes.includes('[Billing: Arrears]')) {
    return 'after_period';
  }
  return 'advanced';
}

export function cleanNotesOfMetadata(notes: string | null | undefined): string {
  if (!notes) return '';
  return notes
    .replace(/<!-- billing_timing: \w+ -->/g, '')
    .replace(/\[Billing: (Advanced|After Period|Arrears)\]/g, '')
    .trim();
}

export function appendBillingTiming(notes: string | null | undefined, timing: 'advanced' | 'after_period'): string {
  const cleaned = cleanNotesOfMetadata(notes);
  const marker = `<!-- billing_timing: ${timing} -->`;
  return cleaned ? `${cleaned}\n\n${marker}` : marker;
}
