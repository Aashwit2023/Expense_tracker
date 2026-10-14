import { rupeesToPaise, paiseToRupees, formatCurrencyINR } from '../utils/currency';

describe('Currency and Integer Paise Calculations', () => {
  test('converts rupees to paise accurately without floating-point errors', () => {
    expect(rupeesToPaise(100)).toBe(10000);
    expect(rupeesToPaise(49.99)).toBe(4999);
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30); // Famous JS floating point bug check: 0.1 + 0.2 === 0.30000000000000004
    expect(rupeesToPaise('1250.75')).toBe(125075);
  });

  test('converts paise to rupees accurately', () => {
    expect(paiseToRupees(10000)).toBe(100);
    expect(paiseToRupees(4999)).toBe(49.99);
    expect(paiseToRupees(30)).toBe(0.3);
  });

  test('formats paise to Indian Rupee currency string', () => {
    const formatted = formatCurrencyINR(10000000); // 1,00,000 INR in paise
    expect(formatted).toContain('1,00,000.00');
  });

  test('throws error on invalid input', () => {
    expect(() => rupeesToPaise('invalid')).toThrow('Invalid rupee amount');
  });
});
