import { z } from 'zod';

export const createTransactionSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  toAccountId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  amount: z.number().int().positive('Amount must be a positive integer in paise'),
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  merchant: z.string().optional().nullable(),
  description: z.string().min(1, 'Description is required'),
  notes: z.string().optional().nullable(),
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER']).default('UPI'),
}).refine((data) => {
  if (data.type === 'TRANSFER' && !data.toAccountId) {
    return false;
  }
  if (data.type === 'TRANSFER' && data.accountId === data.toAccountId) {
    return false;
  }
  return true;
}, {
  message: 'Transfers require a distinct destination account',
  path: ['toAccountId'],
});

export const updateTransactionSchema = z.object({
  accountId: z.string().optional(),
  toAccountId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
  amount: z.number().int().positive().optional(),
  date: z.string().optional(),
  merchant: z.string().optional().nullable(),
  description: z.string().optional(),
  notes: z.string().optional().nullable(),
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER']).optional(),
});
