'use client';

import { FormEvent, useEffect, useState } from 'react';

import { apiFetch } from '../../../lib/api';
import { Store } from '../../../lib/types';

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStores = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch<Store[]>('/stores');
      setStores(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStores();
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError(null);

      const created = await apiFetch<Store>('/stores', {
        method: 'POST',
        body: JSON.stringify({
          name,
          location: location.trim() || null,
        }),
      });

      setStores((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setName('');
      setLocation('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create store');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Stores</h2>
        <p className="mt-1 text-sm text-slate-600">Create and manage supported stores for price submissions.</p>
      </header>

      <form onSubmit={onSubmit} className="card grid gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Store name</label>
          <input value={name} onChange={(event) => setName(event.target.value)} required placeholder="e.g. Continente" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Location</label>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="flex items-end">
          <button className="w-full bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50" disabled={submitting}>
            {submitting ? 'Saving…' : 'Add store'}
          </button>
        </div>
      </form>

      {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <section className="card overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              <th className="px-2 py-2 font-medium">Name</th>
              <th className="px-2 py-2 font-medium">Location</th>
              <th className="px-2 py-2 font-medium">ID</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-2 py-4 text-slate-500" colSpan={3}>
                  Loading stores…
                </td>
              </tr>
            ) : stores.length === 0 ? (
              <tr>
                <td className="px-2 py-4 text-slate-500" colSpan={3}>
                  No stores yet.
                </td>
              </tr>
            ) : (
              stores.map((store) => (
                <tr key={store.id} className="border-b border-slate-100">
                  <td className="px-2 py-3 font-medium">{store.name}</td>
                  <td className="px-2 py-3">{store.location ?? '—'}</td>
                  <td className="px-2 py-3 font-mono text-xs text-slate-500">{store.id}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
