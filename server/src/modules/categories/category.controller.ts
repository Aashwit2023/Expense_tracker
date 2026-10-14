import { Response } from 'express';
import { prisma } from '../../db/prisma';
import { AuthRequest } from '../../middleware/auth.middleware';

export async function getCategories(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { type } = req.query;

  const categories = await prisma.category.findMany({
    where: {
      OR: [{ userId: null }, { userId }],
      ...(type && { type: String(type) }),
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });

  res.json({ success: true, data: categories });
}

export async function createCategory(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { name, type, icon, color } = req.body;

  if (!name || !type) {
    res.status(400).json({ success: false, message: 'Name and type (INCOME or EXPENSE) are required' });
    return;
  }

  const category = await prisma.category.create({
    data: {
      userId,
      name,
      type,
      icon: icon || 'Tag',
      color: color || '#64748B',
      isCustom: true,
    },
  });

  res.status(201).json({ success: true, data: category });
}

export async function updateCategory(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;
  const { name, icon, color } = req.body;

  const existing = await prisma.category.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    res.status(404).json({ success: false, message: 'Custom category not found or unauthorized' });
    return;
  }

  const updated = await prisma.category.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(icon && { icon }),
      ...(color && { color }),
    },
  });

  res.json({ success: true, data: updated });
}

export async function deleteCategory(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;

  const existing = await prisma.category.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    res.status(404).json({ success: false, message: 'Category not found or cannot delete default category' });
    return;
  }

  await prisma.category.delete({ where: { id } });

  res.json({ success: true, message: 'Category deleted successfully' });
}
