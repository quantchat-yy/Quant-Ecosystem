// ============================================================================
// QuantAds - Billing Page
// Payment methods, invoices, credit balance, spending chart, budget alerts
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';

interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'debit_card' | 'bank_account' | 'paypal';
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  email?: string;
}

interface Invoice {
  id: string;
  number: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'failed';
  date: string;
  dueDate: string;
  downloadUrl: string;
  campaignBreakdown: { campaignId: string; campaignName: string; amount: number }[];
}

interface SpendingData {
  date: string;
  amount: number;
  budget: number;
}

interface BudgetAlert {
  id: string;
  type: 'threshold' | 'daily_limit' | 'monthly_limit' | 'anomaly';
  threshold: number;
  currentSpend: number;
  isTriggered: boolean;
  notifyEmail: boolean;
  notifySms: boolean;
  createdAt: string;
}

interface AutoReloadConfig {
  enabled: boolean;
  threshold: number;
  reloadAmount: number;
  maxReloadsPerMonth: number;
  currentReloads: number;
}

interface BillingPageProps {
  accountId?: string;
}

const BillingPage: React.FC<BillingPageProps> = ({ accountId }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [spendingData, setSpendingData] = useState<SpendingData[]>([]);
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [autoReload, setAutoReload] = useState<AutoReloadConfig>({ enabled: false, threshold: 100, reloadAmount: 500, maxReloadsPerMonth: 5, currentReloads: 0 });
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [monthlySpend, setMonthlySpend] = useState<number>(0);
  const [showAddPayment, setShowAddPayment] = useState<boolean>(false);
  const [showAddAlert, setShowAddAlert] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'methods' | 'alerts'>('overview');
  const [newAlertThreshold, setNewAlertThreshold] = useState<number>(1000);
  const [saving, setSaving] = useState<boolean>(false);

  const fetchBillingData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/billing');
      if (!response.ok) throw new Error('Failed to load billing data');
      const data = await response.json();
      setPaymentMethods(data.paymentMethods || []);
      setInvoices(data.invoices || []);
      setSpendingData(data.spending || []);
      setAlerts(data.alerts || []);
      setAutoReload(data.autoReload || autoReload);
      setCreditBalance(data.creditBalance || 0);
      setMonthlySpend(data.monthlySpend || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load billing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const setDefaultPayment = useCallback(async (id: string) => {
    try {
      await fetch(`/api/billing/payment-methods/${id}/default`, { method: 'PUT' });
      setPaymentMethods(prev => prev.map(pm => ({ ...pm, isDefault: pm.id === id })));
    } catch {}
  }, []);

  const removePayment = useCallback(async (id: string) => {
    try {
      await fetch(`/api/billing/payment-methods/${id}`, { method: 'DELETE' });
      setPaymentMethods(prev => prev.filter(pm => pm.id !== id));
    } catch {}
  }, []);

  const toggleAutoReload = useCallback(async () => {
    const updated = { ...autoReload, enabled: !autoReload.enabled };
    try {
      await fetch('/api/billing/auto-reload', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
      setAutoReload(updated);
    } catch {}
  }, [autoReload]);

  const updateAutoReload = useCallback(async (field: keyof AutoReloadConfig, value: number | boolean) => {
    const updated = { ...autoReload, [field]: value };
    setAutoReload(updated);
    try {
      await fetch('/api/billing/auto-reload', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    } catch {}
  }, [autoReload]);

  const addBudgetAlert = useCallback(async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/billing/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'threshold', threshold: newAlertThreshold, notifyEmail: true, notifySms: false }),
      });
      if (!response.ok) throw new Error('Failed to add alert');
      const alert = await response.json();
      setAlerts(prev => [...prev, alert]);
      setShowAddAlert(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [newAlertThreshold]);

  const deleteAlert = useCallback(async (id: string) => {
    await fetch(`/api/billing/alerts/${id}`, { method: 'DELETE' });
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const formatCurrency = (n: number): string => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getInvoiceStatusColor = (status: string): string => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500" />
        <span className="ml-3 text-gray-500">Loading billing...</span>
      </div>
    );
  }

  if (error && paymentMethods.length === 0 && invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-red-500 text-xl mb-4">Billing Error</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={fetchBillingData} className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">Retry</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 min-h-screen">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Billing</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-sm text-gray-500">Credit Balance</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(creditBalance)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-sm text-gray-500">This Month's Spend</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(monthlySpend)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-sm text-gray-500">Payment Method</p>
          <p className="text-2xl font-bold text-gray-900">{paymentMethods.find(p => p.isDefault)?.brand || 'None'} ****{paymentMethods.find(p => p.isDefault)?.last4 || '----'}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b">
        {(['overview', 'invoices', 'methods', 'alerts'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 ${activeTab === tab ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Spending Trend</h2>
            <div className="h-48 flex items-end gap-1 border-b border-l">
              {spendingData.slice(-30).map((point, idx) => {
                const max = Math.max(...spendingData.map(p => p.amount), 1);
                const height = (point.amount / max) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div className="w-full bg-green-400 rounded-t hover:bg-green-600 transition-colors" style={{ height: `${height}%`, minHeight: '2px' }} title={`${point.date}: ${formatCurrency(point.amount)}`} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Auto-Reload</h2>
              <button onClick={toggleAutoReload} className={`relative w-12 h-6 rounded-full transition-colors ${autoReload.enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${autoReload.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {autoReload.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Reload when balance below</label>
                  <input type="number" value={autoReload.threshold} onChange={e => updateAutoReload('threshold', parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Reload amount</label>
                  <input type="number" value={autoReload.reloadAmount} onChange={e => updateAutoReload('reloadAmount', parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No invoices yet</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Invoice</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map(invoice => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{invoice.number}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(invoice.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${getInvoiceStatusColor(invoice.status)}`}>{invoice.status}</span></td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(invoice.amount)}</td>
                    <td className="px-4 py-3 text-right"><a href={invoice.downloadUrl} className="text-blue-500 text-sm hover:underline">Download</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'methods' && (
        <div className="space-y-4">
          {paymentMethods.map(pm => (
            <div key={pm.id} className={`bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between ${pm.isDefault ? 'ring-2 ring-green-500' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">{pm.type === 'paypal' ? '💳' : '💳'}</div>
                <div>
                  <p className="font-medium">{pm.brand || pm.type} ****{pm.last4}</p>
                  {pm.expiryMonth && <p className="text-xs text-gray-500">Expires {pm.expiryMonth}/{pm.expiryYear}</p>}
                  {pm.isDefault && <span className="text-xs text-green-600 font-medium">Default</span>}
                </div>
              </div>
              <div className="flex gap-2">
                {!pm.isDefault && <button onClick={() => setDefaultPayment(pm.id)} className="text-sm text-blue-500 hover:underline">Set Default</button>}
                <button onClick={() => removePayment(pm.id)} className="text-sm text-red-500 hover:underline">Remove</button>
              </div>
            </div>
          ))}
          <button onClick={() => setShowAddPayment(true)} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-green-500 hover:text-green-600">+ Add Payment Method</button>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.map(alert => (
            <div key={alert.id} className={`bg-white rounded-xl shadow-sm border p-4 ${alert.isTriggered ? 'border-red-300 bg-red-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium capitalize">{alert.type.replace('_', ' ')}</p>
                  <p className="text-sm text-gray-600">Threshold: {formatCurrency(alert.threshold)} | Current: {formatCurrency(alert.currentSpend)}</p>
                </div>
                <button onClick={() => deleteAlert(alert.id)} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
              </div>
            </div>
          ))}
          {showAddAlert ? (
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-4">
                <input type="number" value={newAlertThreshold} onChange={e => setNewAlertThreshold(parseInt(e.target.value))} className="px-3 py-2 border rounded-lg" placeholder="Threshold..." />
                <button onClick={addBudgetAlert} disabled={saving} className="px-4 py-2 bg-green-500 text-white rounded-lg">{saving ? 'Adding...' : 'Add Alert'}</button>
                <button onClick={() => setShowAddAlert(false)} className="text-gray-500">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddAlert(true)} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-green-500 hover:text-green-600">+ Add Budget Alert</button>
          )}
        </div>
      )}
    </div>
  );
};

export default BillingPage;
