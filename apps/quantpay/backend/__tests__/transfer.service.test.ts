import { describe, it, expect, beforeEach } from 'vitest';
import { P2PTransferService } from '../services/transfer.service';
import type {
  SendMoneyInput,
  RequestMoneyInput,
  SplitBillInput,
} from '../services/transfer.service';

describe('P2PTransferService', () => {
  let service: P2PTransferService;

  beforeEach(() => {
    service = new P2PTransferService();
  });

  describe('sendMoney', () => {
    it('creates a completed transfer between two users', () => {
      const input: SendMoneyInput = {
        senderId: 'user-1',
        recipientId: 'user-2',
        amount: 50,
        currency: 'USD',
        note: 'Lunch money',
      };

      const transfer = service.sendMoney(input);

      expect(transfer.id).toBeDefined();
      expect(transfer.senderId).toBe('user-1');
      expect(transfer.recipientId).toBe('user-2');
      expect(transfer.amount).toBe(50);
      expect(transfer.currency).toBe('USD');
      expect(transfer.note).toBe('Lunch money');
      expect(transfer.status).toBe('completed');
      expect(transfer.type).toBe('send');
      expect(transfer.createdAt).toBeInstanceOf(Date);
      expect(transfer.completedAt).toBeInstanceOf(Date);
    });

    it('throws SELF_TRANSFER when sending to yourself', () => {
      const input: SendMoneyInput = {
        senderId: 'user-1',
        recipientId: 'user-1',
        amount: 50,
        currency: 'USD',
        note: '',
      };

      expect(() => service.sendMoney(input)).toThrow('Cannot send money to yourself');
    });

    it('generates unique transfer IDs', () => {
      const input: SendMoneyInput = {
        senderId: 'user-1',
        recipientId: 'user-2',
        amount: 10,
        currency: 'USD',
        note: '',
      };

      const t1 = service.sendMoney(input);
      const t2 = service.sendMoney(input);

      expect(t1.id).not.toBe(t2.id);
    });

    it('defaults currency to USD', () => {
      const input = {
        senderId: 'user-1',
        recipientId: 'user-2',
        amount: 25,
        note: '',
      };

      const transfer = service.sendMoney(input as SendMoneyInput);

      expect(transfer.currency).toBe('USD');
    });
  });

  describe('requestMoney', () => {
    it('creates a pending request transfer', () => {
      const input: RequestMoneyInput = {
        requesterId: 'user-2',
        fromUserId: 'user-1',
        amount: 100,
        currency: 'USD',
        note: 'For dinner',
      };

      const transfer = service.requestMoney(input);

      expect(transfer.id).toBeDefined();
      expect(transfer.senderId).toBe('user-1');
      expect(transfer.recipientId).toBe('user-2');
      expect(transfer.amount).toBe(100);
      expect(transfer.status).toBe('pending');
      expect(transfer.type).toBe('request');
      expect(transfer.completedAt).toBeNull();
    });

    it('throws SELF_REQUEST when requesting from yourself', () => {
      const input: RequestMoneyInput = {
        requesterId: 'user-1',
        fromUserId: 'user-1',
        amount: 50,
        currency: 'USD',
        note: '',
      };

      expect(() => service.requestMoney(input)).toThrow('Cannot request money from yourself');
    });
  });

  describe('approveRequest', () => {
    it('approves a pending request transfer', () => {
      const request = service.requestMoney({
        requesterId: 'user-2',
        fromUserId: 'user-1',
        amount: 75,
        currency: 'USD',
        note: 'Groceries',
      });

      const approved = service.approveRequest(request.id, 'user-1');

      expect(approved.status).toBe('completed');
      expect(approved.completedAt).toBeInstanceOf(Date);
    });

    it('throws when non-payer tries to approve', () => {
      const request = service.requestMoney({
        requesterId: 'user-2',
        fromUserId: 'user-1',
        amount: 75,
        currency: 'USD',
        note: '',
      });

      expect(() => service.approveRequest(request.id, 'user-3')).toThrow(
        'Only the payer can approve this request',
      );
    });

    it('throws TRANSFER_NOT_FOUND for non-existent transfer', () => {
      expect(() => service.approveRequest('non-existent', 'user-1')).toThrow('Transfer not found');
    });

    it('throws when trying to approve a non-pending transfer', () => {
      const request = service.requestMoney({
        requesterId: 'user-2',
        fromUserId: 'user-1',
        amount: 50,
        currency: 'USD',
        note: '',
      });

      service.approveRequest(request.id, 'user-1');

      expect(() => service.approveRequest(request.id, 'user-1')).toThrow('Transfer is not pending');
    });
  });

  describe('splitBill', () => {
    it('creates a split bill among participants', () => {
      const input: SplitBillInput = {
        creatorId: 'user-1',
        description: 'Dinner at restaurant',
        totalAmount: 100,
        currency: 'USD',
        participantIds: ['user-2', 'user-3', 'user-4'],
      };

      const bill = service.splitBill(input);

      expect(bill.id).toBeDefined();
      expect(bill.creatorId).toBe('user-1');
      expect(bill.description).toBe('Dinner at restaurant');
      expect(bill.totalAmount).toBe(100);
      expect(bill.participants).toHaveLength(3);
      expect(bill.createdAt).toBeInstanceOf(Date);
    });

    it('splits amount evenly among all participants including creator', () => {
      const input: SplitBillInput = {
        creatorId: 'user-1',
        description: 'Pizza night',
        totalAmount: 60,
        currency: 'USD',
        participantIds: ['user-2', 'user-3'],
      };

      const bill = service.splitBill(input);

      // 60 / 3 people (creator + 2 participants) = 20 each
      expect(bill.participants[0]!.amount).toBe(20);
      expect(bill.participants[1]!.amount).toBe(20);
    });

    it('sets all participant statuses to pending', () => {
      const input: SplitBillInput = {
        creatorId: 'user-1',
        description: 'Concert tickets',
        totalAmount: 200,
        currency: 'USD',
        participantIds: ['user-2', 'user-3'],
      };

      const bill = service.splitBill(input);

      for (const participant of bill.participants) {
        expect(participant.status).toBe('pending');
        expect(participant.transferId).toBeNull();
      }
    });
  });

  describe('getTransferHistory', () => {
    it('returns transfers where user is sender or recipient', () => {
      service.sendMoney({
        senderId: 'user-1',
        recipientId: 'user-2',
        amount: 10,
        currency: 'USD',
        note: '',
      });
      service.sendMoney({
        senderId: 'user-2',
        recipientId: 'user-1',
        amount: 20,
        currency: 'USD',
        note: '',
      });
      service.sendMoney({
        senderId: 'user-3',
        recipientId: 'user-4',
        amount: 30,
        currency: 'USD',
        note: '',
      });

      const history = service.getTransferHistory('user-1');

      expect(history).toHaveLength(2);
    });

    it('returns empty array for user with no transfers', () => {
      const history = service.getTransferHistory('user-new');

      expect(history).toEqual([]);
    });

    it('returns transfers sorted by date descending', () => {
      service.sendMoney({
        senderId: 'user-1',
        recipientId: 'user-2',
        amount: 10,
        currency: 'USD',
        note: 'first',
      });
      service.sendMoney({
        senderId: 'user-1',
        recipientId: 'user-3',
        amount: 20,
        currency: 'USD',
        note: 'second',
      });

      const history = service.getTransferHistory('user-1');

      expect(history[0]!.createdAt.getTime()).toBeGreaterThanOrEqual(
        history[1]!.createdAt.getTime(),
      );
    });
  });

  describe('cancelTransfer', () => {
    it('cancels a pending transfer', () => {
      const request = service.requestMoney({
        requesterId: 'user-2',
        fromUserId: 'user-1',
        amount: 50,
        currency: 'USD',
        note: '',
      });

      const cancelled = service.cancelTransfer(request.id, 'user-1');

      expect(cancelled.status).toBe('cancelled');
    });

    it('throws when trying to cancel a completed transfer', () => {
      const transfer = service.sendMoney({
        senderId: 'user-1',
        recipientId: 'user-2',
        amount: 50,
        currency: 'USD',
        note: '',
      });

      expect(() => service.cancelTransfer(transfer.id, 'user-1')).toThrow(
        'Only pending transfers can be cancelled',
      );
    });

    it('throws when unauthorized user tries to cancel', () => {
      const request = service.requestMoney({
        requesterId: 'user-2',
        fromUserId: 'user-1',
        amount: 50,
        currency: 'USD',
        note: '',
      });

      expect(() => service.cancelTransfer(request.id, 'user-3')).toThrow(
        'Not authorized to cancel this transfer',
      );
    });

    it('throws TRANSFER_NOT_FOUND for non-existent transfer', () => {
      expect(() => service.cancelTransfer('non-existent', 'user-1')).toThrow('Transfer not found');
    });
  });

  describe('getTransfer', () => {
    it('returns the transfer by id', () => {
      const created = service.sendMoney({
        senderId: 'user-1',
        recipientId: 'user-2',
        amount: 25,
        currency: 'USD',
        note: 'test',
      });

      const transfer = service.getTransfer(created.id);

      expect(transfer.id).toBe(created.id);
      expect(transfer.amount).toBe(25);
    });

    it('throws TRANSFER_NOT_FOUND for non-existent transfer', () => {
      expect(() => service.getTransfer('non-existent')).toThrow('Transfer not found');
    });
  });

  describe('getSplitBill', () => {
    it('returns the split bill by id', () => {
      const created = service.splitBill({
        creatorId: 'user-1',
        description: 'Test bill',
        totalAmount: 90,
        currency: 'USD',
        participantIds: ['user-2', 'user-3'],
      });

      const bill = service.getSplitBill(created.id);

      expect(bill.id).toBe(created.id);
      expect(bill.totalAmount).toBe(90);
    });

    it('throws SPLIT_BILL_NOT_FOUND for non-existent bill', () => {
      expect(() => service.getSplitBill('non-existent')).toThrow('Split bill not found');
    });
  });
});
