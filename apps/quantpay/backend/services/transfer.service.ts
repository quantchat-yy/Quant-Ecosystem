import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface Transfer {
  id: string;
  senderId: string;
  recipientId: string;
  amount: number;
  currency: string;
  note: string;
  status: 'pending' | 'completed' | 'cancelled' | 'failed';
  type: 'send' | 'request' | 'split';
  createdAt: Date;
  completedAt: Date | null;
}

export interface SplitBillItem {
  userId: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  transferId: string | null;
}

export interface SplitBill {
  id: string;
  creatorId: string;
  description: string;
  totalAmount: number;
  currency: string;
  participants: SplitBillItem[];
  createdAt: Date;
}

export const SendMoneySchema = z.object({
  senderId: z.string().min(1),
  recipientId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(3).max(3).default('USD'),
  note: z.string().max(500).default(''),
});

export type SendMoneyInput = z.infer<typeof SendMoneySchema>;

export const RequestMoneySchema = z.object({
  requesterId: z.string().min(1),
  fromUserId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(3).max(3).default('USD'),
  note: z.string().max(500).default(''),
});

export type RequestMoneyInput = z.infer<typeof RequestMoneySchema>;

export const SplitBillSchema = z.object({
  creatorId: z.string().min(1),
  description: z.string().min(1).max(200),
  totalAmount: z.number().positive(),
  currency: z.string().min(3).max(3).default('USD'),
  participantIds: z.array(z.string().min(1)).min(1),
});

export type SplitBillInput = z.infer<typeof SplitBillSchema>;

export class P2PTransferService {
  private readonly transfers = new Map<string, Transfer>();
  private readonly splitBills = new Map<string, SplitBill>();

  sendMoney(input: SendMoneyInput): Transfer {
    const parsed = SendMoneySchema.parse(input);

    if (parsed.senderId === parsed.recipientId) {
      throw createAppError('Cannot send money to yourself', 400, 'SELF_TRANSFER');
    }

    const transfer: Transfer = {
      id: randomUUID(),
      senderId: parsed.senderId,
      recipientId: parsed.recipientId,
      amount: parsed.amount,
      currency: parsed.currency,
      note: parsed.note,
      status: 'completed',
      type: 'send',
      createdAt: new Date(),
      completedAt: new Date(),
    };

    this.transfers.set(transfer.id, transfer);
    return transfer;
  }

  requestMoney(input: RequestMoneyInput): Transfer {
    const parsed = RequestMoneySchema.parse(input);

    if (parsed.requesterId === parsed.fromUserId) {
      throw createAppError('Cannot request money from yourself', 400, 'SELF_REQUEST');
    }

    const transfer: Transfer = {
      id: randomUUID(),
      senderId: parsed.fromUserId,
      recipientId: parsed.requesterId,
      amount: parsed.amount,
      currency: parsed.currency,
      note: parsed.note,
      status: 'pending',
      type: 'request',
      createdAt: new Date(),
      completedAt: null,
    };

    this.transfers.set(transfer.id, transfer);
    return transfer;
  }

  approveRequest(transferId: string, approverId: string): Transfer {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      throw createAppError('Transfer not found', 404, 'TRANSFER_NOT_FOUND');
    }

    if (transfer.type !== 'request') {
      throw createAppError('Transfer is not a request', 400, 'NOT_A_REQUEST');
    }

    if (transfer.senderId !== approverId) {
      throw createAppError('Only the payer can approve this request', 403, 'UNAUTHORIZED');
    }

    if (transfer.status !== 'pending') {
      throw createAppError('Transfer is not pending', 400, 'TRANSFER_NOT_PENDING');
    }

    transfer.status = 'completed';
    transfer.completedAt = new Date();
    return transfer;
  }

  splitBill(input: SplitBillInput): SplitBill {
    const parsed = SplitBillSchema.parse(input);

    const splitAmount =
      Math.round((parsed.totalAmount / (parsed.participantIds.length + 1)) * 100) / 100;

    const participants: SplitBillItem[] = parsed.participantIds.map((userId) => ({
      userId,
      amount: splitAmount,
      status: 'pending' as const,
      transferId: null,
    }));

    const bill: SplitBill = {
      id: randomUUID(),
      creatorId: parsed.creatorId,
      description: parsed.description,
      totalAmount: parsed.totalAmount,
      currency: parsed.currency,
      participants,
      createdAt: new Date(),
    };

    this.splitBills.set(bill.id, bill);
    return bill;
  }

  getTransferHistory(userId: string): Transfer[] {
    const transfers: Transfer[] = [];
    for (const transfer of this.transfers.values()) {
      if (transfer.senderId === userId || transfer.recipientId === userId) {
        transfers.push(transfer);
      }
    }
    return transfers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  cancelTransfer(transferId: string, userId: string): Transfer {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      throw createAppError('Transfer not found', 404, 'TRANSFER_NOT_FOUND');
    }

    if (transfer.status !== 'pending') {
      throw createAppError('Only pending transfers can be cancelled', 400, 'TRANSFER_NOT_PENDING');
    }

    if (transfer.senderId !== userId && transfer.recipientId !== userId) {
      throw createAppError('Not authorized to cancel this transfer', 403, 'UNAUTHORIZED');
    }

    transfer.status = 'cancelled';
    return transfer;
  }

  getTransfer(transferId: string): Transfer {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      throw createAppError('Transfer not found', 404, 'TRANSFER_NOT_FOUND');
    }
    return transfer;
  }

  getSplitBill(billId: string): SplitBill {
    const bill = this.splitBills.get(billId);
    if (!bill) {
      throw createAppError('Split bill not found', 404, 'SPLIT_BILL_NOT_FOUND');
    }
    return bill;
  }
}
