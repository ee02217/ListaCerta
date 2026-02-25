'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { apiFetch } from '../../../lib/api';
import { Product } from '../../../lib/types';

export default function ProductsPage() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canSearch = useMemo(() => query.trim().length > 0, [query]);

  const loadProducts = async (search: string) => {
    try {
      setLoading(true);
      setError(null);

      const searchParam = search.trim() ? `?q=${encodeURIComponent(search.trim())}&limit=100` : '?limit=100';
      const response = await apiFetch<Product[]>(`/products${searchParam}`);
      setProducts(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts('');
  }, []);

  const onSearch = async (event: FormEvent) => {
    event.preventDefault();
    await loadProducts(query);
  };

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Products</h2>
        <p className="mt-1 text-sm text-slate-600">
          Search catalog products and open the edit page to override OFF data.
        </p>
      </header>

      <form onSubmit={onSearch} className="card flex flex-col gap-3 md:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by barcode, name or brand"
        />
        <button className="bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50" disabled={!canSearch && loading}>
          Search
        </button>
        <button
          className="border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
          type="button"
          onClick={() => {
            setQuery('');
            void loadProducts('');
          }}
        >
          Reset
        </button>
      </form>

      {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <section className="card overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              <th className="px-2 py-2 font-medium">Barcode</th>
              <th className="px-2 py-2 font-medium">Name</th>
              <th className="px-2 py-2 font-medium">Brand</th>
              <th className="px-2 py-2 font-medium">Source</th>
              <th className="px-2 py-2 font-medium">Verified</th>
              <th className="px-2 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-2 py-4 text-slate-500" colSpan={6}>
                  Loading products…
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td className="px-2 py-4 text-slate-500" colSpan={6}>
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-b border-slate-100 align-top">
                  <td className="px-2 py-3 font-mono text-xs">{product.barcode}</td>
                  <td className="px-2 py-3">{product.name}</td>
                  <td className="px-2 py-3">{product.brand ?? '—'}</td>
                  <td className="px-2 py-3">{product.source}</td>
                  <td className="px-2 py-3">
                    <span
                      className={
                        product.isVerified
                          ? 'rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700'
                          : 'rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600'
                      }
                    >
                      {product.isVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/products/${product.id}`}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100"
                        onClick={() => alert('Merge duplicates is a placeholder for now.')}
                      >
                        Merge duplicates
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
