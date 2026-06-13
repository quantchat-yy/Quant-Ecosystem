export * from './core/payment-engine';
export * from './models/payment-method';
export * from './models/transaction';

import { PaymentEngine } from './core/payment-engine';

export const paymentEngine = new PaymentEngine();
export type { PaymentMethod } from './models/payment-method';
export type { Transaction } from './models/transaction';
