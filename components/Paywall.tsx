'use client';

import { useState } from 'react';
import { MONTHLY_PRICE_USD, YEARLY_PRICE_USD, type BillingInterval } from '@/lib/paypal';

export default function Paywall({
  open,
  onClose,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  onError: (message: string) => void;
}) {
  const [interval, setInterval_] = useState<BillingInterval>('yearly');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const yearlyMonthlyEquivalent = (parseFloat(YEARLY_PRICE_USD) / 12).toFixed(2);

  async function handleSubscribe() {
    setLoading(true);
    try {
      const res = await fetch('/api/paypal/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error || 'Payment couldn\u2019t be started.');
        setLoading(false);
        return;
      }
      window.location.href = data.approveUrl;
    } catch {
      onError('Payment couldn\u2019t be started. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Upgrade to Pro</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-400 hover:text-zinc-700"
          >
            &#10005;
          </button>
        </div>
        <p className="mt-1 text-sm text-zinc-500">Unlimited explanations, no daily cap.</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={() => setInterval_('monthly')}
            className={`rounded-lg border px-3 py-3 text-left transition ${
              interval === 'monthly'
                ? 'border-zinc-900 bg-zinc-50'
                : 'border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <p className="text-sm font-medium text-zinc-900">Monthly</p>
            <p className="mt-0.5 text-sm text-zinc-500">${MONTHLY_PRICE_USD}/mo</p>
          </button>

          <button
            onClick={() => setInterval_('yearly')}
            className={`relative rounded-lg border px-3 py-3 text-left transition ${
              interval === 'yearly'
                ? 'border-zinc-900 bg-zinc-50'
                : 'border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <span className="absolute -top-2 right-2 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              Save 17%
            </span>
            <p className="text-sm font-medium text-zinc-900">Yearly</p>
            <p className="mt-0.5 text-sm text-zinc-500">${yearlyMonthlyEquivalent}/mo</p>
          </button>
        </div>

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-zinc-900 py-2.5 font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading
            ? 'Please wait...'
            : `Pay with PayPal — $${interval === 'monthly' ? MONTHLY_PRICE_USD : YEARLY_PRICE_USD}${
                interval === 'monthly' ? '/mo' : '/yr'
              }`}
        </button>

        <p className="mt-3 text-center text-xs text-zinc-400">Cancel anytime from PayPal.</p>
      </div>
    </div>
  );
}
