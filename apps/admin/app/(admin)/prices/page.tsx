'use client';

import { useEffect, useMemo, useState } from 'react';

import { apiFetch } from '../../../lib/api';
import { ModerationPrice } from '../../../lib/types';

type StatusFilter = 'all' | 'active' | 'flagged';

export default function PricesModerationPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [prices, setPrices] = useState<ModerationPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const endpoint = useMemo(() => {
    if (statusFilter === 'all') {
      return '/prices/moderation?limit=100';
    }

    return `/prices/moderation?status=${statusFilter}&limit=100`;
  }, [statusFilter]);

  const loadPrices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch<ModerationPrice[]>(endpoint);
      setPrices(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPrices();
  }, [endpoint]);

  const moderate = async (id: string, status: 'active' | 'flagged') => {
    try {
      setUpdatingId(id);
      await apiFetch<ModerationPrice>(`/prices/${id}/moderation`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      setPrices((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status,
              }
            : item,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update moderation status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Prices moderation</h2>
        <p className="mt-1 text-sm text-slate-600">Flag outliers and approve/reject submitted prices.</p>
      </header>

      <section className="card flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-600">Filter:</span>
        {(['all', 'active', 'flagged'] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            className={
              statusFilter === filter
                ? 'bg-teal-700 text-white hover:bg-teal-800'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }
            onClick={() => setStatusFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </section>

      {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <section className="card overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              <th className="px-2 py-2 font-medium">Product</th>
              <th className="px-2 py-2 font-medium">Store</th>
              <th className="px-2 py-2 font-medium">Price</th>
              <th className="px-2 py-2 font-medium">Confidence</th>
              <th className="px-2 py-2 font-medium">Captured at</th>
              <th className="px-2 py-2 font-medium">Status</th>
              <th className="px-2 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-2 py-4 text-slate-500" colSpan={7}>
                  Loading prices…
                </td>
              </tr>
            ) : prices.length === 0 ? (
              <tr>
                <td className="px-2 py-4 text-slate-500" colSpan={7}>
                  No price entries found.
                </td>
              </tr>
            ) : (
              prices.map((price) => {
                const amount = (price.priceCents / 100).toFixed(2);
                const isUpdating = updatingId === price.id;

                return (
                  <tr key={price.id} className="border-b border-slate-100 align-top">
                    <td className="px-2 py-3">
                      <p className="font-medium">{price.product.name}</p>
                      <p className="text-xs text-slate-500">{price.product.barcode}</p>
                    </td>
                    <td className="px-2 py-3">{price.store.name}</td>
                    <td className="px-2 py-3 font-medium">
                      {amount} {price.currency}
                    </td>
                    <td className="px-2 py-3">
                      <span
                        className={
                          price.confidenceScore < 0.5
                            ? 'rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700'
                            : 'rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700'
                        }
                      >
                        {(price.confidenceScore * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-2 py-3 text-xs text-slate-500">
                      {new Date(price.capturedAt).toLocaleString()}
                    </td>
                    <td className="px-2 py-3">
                      <span
                        className={
                          price.status === 'active'
                            ? 'rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700'
                            : 'rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700'
                        }
                      >
                        {price.status}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={isUpdating}
                          className="border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                          onClick={() => moderate(price.id, 'flagged')}
                        >
                          Flag outlier
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                          onClick={() => moderate(price.id, 'active')}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          className="bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                          onClick={() => moderate(price.id, 'flagged')}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
