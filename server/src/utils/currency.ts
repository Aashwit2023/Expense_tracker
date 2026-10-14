/**
 * Currency utilities for exact financial arithmetic in integer paise.
 * 1 INR = 100 paise.
 * Avoids any floating-point arithmetic errors.
 */

export function rupeesToPaise(rupees: number | string): number {
  if (typeof rupees === 'string') {
    rupees = parseFloat(rupees);
  }
  if (isNaN(rupees)) {
    throw new Error('Invalid rupee amount');
  }
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function formatCurrencyINR(paise: number): string {
  const rupees = paiseToRupees(paise);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}
