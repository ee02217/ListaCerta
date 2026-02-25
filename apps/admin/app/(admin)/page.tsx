import Link from 'next/link';

import { apiFetch } from '../../lib/api';
import { AnalyticsSummary, DeviceUsage, ModerationPrice } from '../../lib/types';

async function getDashboardData() {
  try {
    const [analytics, prices, devices] = await Promise.all([
      apiFetch<AnalyticsSummary>('/analytics/summary?limit=5'),
      apiFetch<ModerationPrice[]>('/prices/moderation?limit=200'),
      apiFetch<DeviceUsage[]>('/devices?limit=500'),
    ]);

    const flaggedCount = prices.filter((item) => item.status === 'flagged').length;
    const latestDeviceUsage = devices
      .map((item) => item.lastUsedAt)
      .filter(Boolean)
      .sort((a, b) => (a! < b! ? 1 : -1))[0] ?? null;

    return {
      analytics,
      flaggedCount,
      devicesCount: devices.length,
      latestDeviceUsage,
      error: null,
    };
  } catch (error) {
    return {
      analytics: {
        totals: { products: 0, prices: 0 },
        mostActiveStores: [],
        mostScannedProducts: [],
        generatedAt: new Date().toISOString(),
      },
      flaggedCount: 0,
      devicesCount: 0,
      latestDeviceUsage: null,
      error: error instanceof Error ? error.message : 'Unknown error loading dashboard',
    };
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-600">
          Summary metrics and usage trends for ListaCerta.
        </p>
      </header>

      {data.error ? (
        <div className="card border-rose-200 bg-rose-50 text-rose-700">Failed to load data: {data.error}</div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <article className="card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total products</p>
          <p className="mt-2 text-3xl font-semibold">{data.analytics.totals.products}</p>
        </article>
        <article className="card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total prices</p>
          <p className="mt-2 text-3xl font-semibold">{data.analytics.totals.prices}</p>
        </article>
        <article className="card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Flagged prices</p>
          <p className="mt-2 text-3xl font-semibold text-amber-600">{data.flaggedCount}</p>
        </article>
        <article className="card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Registered devices</p>
          <p className="mt-2 text-3xl font-semibold">{data.devicesCount}</p>
        </article>
        <article className="card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Last device usage</p>
          <p className="mt-2 text-sm font-semibold">
            {data.latestDeviceUsage ? new Date(data.latestDeviceUsage).toLocaleString() : 'No submissions'}
          </p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="card">
          <h3 className="text-base font-semibold">Most active stores</h3>
          <div className="mt-3 space-y-2">
            {data.analytics.mostActiveStores.length === 0 ? (
              <p className="text-sm text-slate-500">No store activity yet.</p>
            ) : (
              data.analytics.mostActiveStores.map((store) => (
                <div key={store.storeId} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                  <span className="text-sm font-medium text-slate-800">{store.name}</span>
                  <span className="text-xs font-semibold text-slate-600">{store.submissionsCount} submissions</span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="card">
          <h3 className="text-base font-semibold">Most scanned products</h3>
          <div className="mt-3 space-y-2">
            {data.analytics.mostScannedProducts.length === 0 ? (
              <p className="text-sm text-slate-500">No product scan activity yet.</p>
            ) : (
              data.analytics.mostScannedProducts.map((product) => (
                <div key={product.productId} className="rounded-md border border-slate-200 px-3 py-2">
                  <p className="text-sm font-medium text-slate-800">{product.name}</p>
                  <p className="text-xs text-slate-500">{product.barcode}</p>
                  <p className="text-xs font-semibold text-slate-600">{product.scansCount} scans</p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="card">
        <h3 className="text-base font-semibold">Quick actions</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link className="rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800" href="/products">
            Manage products
          </Link>
          <Link className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" href="/stores">
            Manage stores
          </Link>
          <Link className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" href="/prices">
            Moderate prices
          </Link>
          <Link className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" href="/devices">
            View devices
          </Link>
        </div>
      </section>
    </div>
  );
}
