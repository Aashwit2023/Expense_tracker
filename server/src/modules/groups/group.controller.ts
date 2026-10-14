import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { GroupService } from './group.service';

export async function getGroups(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const groups = await GroupService.getUserGroups(userId);
    res.json({ success: true, data: groups });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch groups' });
  }
}

export async function createGroup(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { name, description, type, currency, imageUrl, creatorUpiId, initialMembers } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Group name is required' });
      return;
    }

    const group = await GroupService.createGroup(userId, {
      name: name.trim(),
      description,
      type,
      currency,
      imageUrl,
      creatorUpiId,
      initialMembers,
    });

    res.status(201).json({ success: true, data: group });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to create group' });
  }
}

export async function getGroupDetails(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { category, payerId, participantId, startDate, endDate } = req.query as Record<string, string>;

    const data = await GroupService.getGroupById(userId, id, {
      category,
      payerId,
      participantId,
      startDate,
      endDate,
    });

    res.json({ success: true, data });
  } catch (error: any) {
    const status = error.message.includes('Access denied') ? 403 : 404;
    res.status(status).json({ success: false, message: error.message || 'Failed to fetch group' });
  }
}

export async function addExpense(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id: groupId } = req.params;
    const {
      title,
      description,
      amount,
      date,
      category,
      payerId,
      splitMethod,
      participantIds,
      allocations,
      percentages,
      shares,
      items,
      notes,
      receiptUrl,
      paymentAccountId,
    } = req.body;

    if (!title || !amount || !date || !payerId || !splitMethod || !participantIds) {
      res.status(400).json({
        success: false,
        message: 'Title, amount, date, payer, split method, and participants are required',
      });
      return;
    }

    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ success: false, message: 'Amount must be a positive integer in paise' });
      return;
    }

    const updated = await GroupService.addExpense(userId, groupId, {
      title,
      description,
      amount: parsedAmount,
      date,
      category,
      payerId,
      splitMethod,
      participantIds,
      allocations,
      percentages,
      shares,
      items,
      notes,
      receiptUrl,
      paymentAccountId,
    });

    res.status(201).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to add expense' });
  }
}

export async function cancelExpense(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id: groupId, expenseId } = req.params;

    const updated = await GroupService.cancelExpense(userId, groupId, expenseId);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to cancel expense' });
  }
}

export async function recordSettlement(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id: groupId } = req.params;
    const { payerId, recipientId, amount, date, notes, reference, depositAccountId, paymentAccountId } = req.body;

    if (!payerId || !recipientId || amount === undefined) {
      res.status(400).json({
        success: false,
        message: 'Payer, recipient, and amount are required',
      });
      return;
    }

    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ success: false, message: 'Amount must be a positive integer in paise' });
      return;
    }

    const updated = await GroupService.recordSettlement(userId, groupId, {
      payerId,
      recipientId,
      amount: parsedAmount,
      date,
      notes,
      reference,
      depositAccountId,
      paymentAccountId,
    });

    res.status(201).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to record repayment' });
  }
}

export async function reverseSettlement(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id: groupId, settlementId } = req.params;

    const updated = await GroupService.reverseSettlement(userId, groupId, settlementId);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to reverse settlement' });
  }
}

export async function addMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id: groupId } = req.params;
    const { name, email, upiId, role } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Member name is required' });
      return;
    }

    const updated = await GroupService.addMember(userId, groupId, {
      name: name.trim(),
      email,
      upiId,
      role,
    });

    res.status(201).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to add member' });
  }
}

export async function leaveGroup(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id: groupId } = req.params;

    const result = await GroupService.leaveGroup(userId, groupId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to leave group' });
  }
}

export async function setBudget(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id: groupId } = req.params;
    const { amount, period, categoryLimits } = req.body;

    if (amount === undefined) {
      res.status(400).json({ success: false, message: 'Budget amount is required' });
      return;
    }

    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      res.status(400).json({ success: false, message: 'Budget amount must be a positive integer in paise' });
      return;
    }

    const updated = await GroupService.setBudget(userId, groupId, {
      amount: parsedAmount,
      period,
      categoryLimits,
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to set budget' });
  }
}

export async function updateExpense(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id: groupId, expenseId } = req.params;
    const {
      title,
      description,
      amount,
      date,
      category,
      payerId,
      splitMethod,
      participantIds,
      allocations,
      percentages,
      shares,
      items,
      notes,
      receiptUrl,
      paymentAccountId,
    } = req.body;

    if (!title || !amount || !date || !payerId || !splitMethod || !participantIds) {
      res.status(400).json({
        success: false,
        message: 'Title, amount, date, payer, split method, and participants are required',
      });
      return;
    }

    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ success: false, message: 'Amount must be a positive integer in paise' });
      return;
    }

    const updated = await GroupService.updateExpense(userId, groupId, expenseId, {
      title,
      description,
      amount: parsedAmount,
      date,
      category,
      payerId,
      splitMethod,
      participantIds,
      allocations,
      percentages,
      shares,
      items,
      notes,
      receiptUrl,
      paymentAccountId,
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to update expense' });
  }
}

export async function adjustBalance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id: groupId } = req.params;
    const { memberId, targetBalancePaise, balancingMemberId, notes } = req.body;

    if (!memberId || targetBalancePaise === undefined) {
      res.status(400).json({ success: false, message: 'memberId and targetBalancePaise are required' });
      return;
    }

    const parsedPaise = parseInt(targetBalancePaise, 10);
    if (isNaN(parsedPaise)) {
      res.status(400).json({ success: false, message: 'targetBalancePaise must be a valid integer' });
      return;
    }

    const updated = await GroupService.adjustBalance(userId, groupId, {
      memberId,
      targetBalancePaise: parsedPaise,
      balancingMemberId,
      notes,
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to adjust balance' });
  }
}

export async function deleteGroup(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id: groupId } = req.params;

    const result = await GroupService.deleteGroup(userId, groupId);
    res.json(result);
  } catch (error: any) {
    const status = error.message.includes('Only the group creator or admin') ? 403 : 400;
    res.status(status).json({ success: false, message: error.message || 'Failed to delete group' });
  }
}

