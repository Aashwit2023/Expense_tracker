/**
 * Formats integer paise into clean Indian Rupees format.
 * Example: 2500000 paise -> ₹25,000.00
 */
export function formatCurrency(paise: number = 0, currency = 'INR'): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function formatCompactCurrency(paise: number = 0): string {
  const rupees = paise / 100;
  if (Math.abs(rupees) >= 10000000) {
    return `₹${(rupees / 10000000).toFixed(2)} Cr`;
  }
  if (Math.abs(rupees) >= 100000) {
    return `₹${(rupees / 100000).toFixed(2)} L`;
  }
  if (Math.abs(rupees) >= 1000) {
    return `₹${(rupees / 1000).toFixed(1)}k`;
  }
  return formatCurrency(paise);
}

export function formatChartAxisTick(paise: number = 0): string {
  const rupees = Math.round(paise / 100);
  const absRupees = Math.abs(rupees);
  const sign = rupees < 0 ? '-' : '';
  if (absRupees >= 10000000) {
    const cr = absRupees / 10000000;
    return `${sign}₹${cr % 1 === 0 ? cr : cr.toFixed(1)}Cr`;
  }
  if (absRupees >= 100000) {
    const l = absRupees / 100000;
    return `${sign}₹${l % 1 === 0 ? l : l.toFixed(1)}L`;
  }
  if (absRupees >= 1000) {
    const k = absRupees / 1000;
    return `${sign}₹${k % 1 === 0 ? k : k.toFixed(1)}k`;
  }
  return `${sign}₹${absRupees}`;
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateInput(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function rupeesToPaise(rupees: number | string): number {
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}
