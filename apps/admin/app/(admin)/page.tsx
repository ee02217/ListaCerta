import Link from 'next/link';

import { apiFetch } from '../../lib/api';
import { DeviceUsage, ModerationPrice, Product, Store } from '../../lib/types';

async function getDashboardData() {
  try {
    const [products, stores, prices, devices] = await Promise.all([
      apiFetch<Product[]>('/products?limit=50'),
      apiFetch<Store[]>('/stores'),
      apiFetch<ModerationPrice[]>('/prices/moderation?limit=100'),
      apiFetch<DeviceUsage[]>('/devices?limit=500'),
    ]);

    const flaggedCount = prices.filter((item) => item.status === 'flagged').length;
    const latestDeviceUsage = devices
      .map((item) => item.lastUsedAt)
      .filter(Boolean)
      .sort((a, b) => (a! < b! ? 1 : -1))[0] ?? null;

    return {
      productCount: products.length,
      storesCount: stores.length,
      pricesCount: prices.length,
      flaggedCount,
      devicesCount: devices.length,
      latestDeviceUsage,
      error: null,
    };
  } catch (error) {
    return {
      productCount: 0,
      storesCount: 0,
      pricesCount: 0,
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
          Quick overview of products, stores, and price moderation activity.
        </p>
      </header>

      {data.error ? (
        <div className="card border-rose-200 bg-rose-50 text-rose-700">Failed to load data: {data.error}</div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <article className="card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Products indexed</p>
          <p className="mt-2 text-3xl font-semibold">{data.productCount}</p>
        </article>
        <article className="card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Stores</p>
          <p className="mt-2 text-3xl font-semibold">{data.storesCount}</p>
        </article>
        <article className="card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Prices captured</p>
          <p className="mt-2 text-3xl font-semibold">{data.pricesCount}</p>
        </article>
        <article className="card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Flagged prices</p>
          <p className="mt-2 text-3xl font-semibold text-amber-600">{data.flaggedCount}</p>
        </article>
        <article className="card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Registered devices</p>
          <p className="mt-2 text-3xl font-semibold">{data.devicesCount}</p>
          <p className="mt-2 text-xs text-slate-500">
            Last used:{' '}
            {data.latestDeviceUsage ? new Date(data.latestDeviceUsage).toLocaleString() : 'No submissions'}
          </p>
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
