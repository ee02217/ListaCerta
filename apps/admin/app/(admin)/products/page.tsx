'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import { apiFetch } from '../../../lib/api';
import { Product } from '../../../lib/types';

type EditableProduct = {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string;
  source: 'OFF' | 'manual';
};

const toEditable = (product: Product): EditableProduct => ({
  id: product.id,
  barcode: product.barcode,
  name: product.name,
  brand: product.brand ?? '',
  category: product.category ?? '',
  imageUrl: product.imageUrl ?? '',
  source: product.source,
});

export default function ProductsPage() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<EditableProduct | null>(null);

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

  const saveEdit = async () => {
    if (!editing) {
      return;
    }

    try {
      setSaving(true);

      await apiFetch<Product>(`/products/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          barcode: editing.barcode,
          name: editing.name,
          brand: editing.brand || null,
          category: editing.category || null,
          imageUrl: editing.imageUrl || null,
          source: editing.source,
        }),
      });

      setProducts((current) =>
        current.map((item) =>
          item.id === editing.id
            ? {
                ...item,
                barcode: editing.barcode,
                name: editing.name,
                brand: editing.brand || null,
                category: editing.category || null,
                imageUrl: editing.imageUrl || null,
                source: editing.source,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );

      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Products</h2>
        <p className="mt-1 text-sm text-slate-600">Search, review and edit product catalog records.</p>
      </header>

      <form onSubmit={onSearch} className="card flex flex-col gap-3 md:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by barcode or name"
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
              <th className="px-2 py-2 font-medium">Category</th>
              <th className="px-2 py-2 font-medium">Source</th>
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
                  <td className="px-2 py-3">{product.category ?? '—'}</td>
                  <td className="px-2 py-3">{product.source}</td>
                  <td className="px-2 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        onClick={() => setEditing(toEditable(product))}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
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

      {editing ? (
        <section className="card space-y-3">
          <h3 className="text-base font-semibold">Edit product</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Barcode</label>
              <input
                value={editing.barcode}
                onChange={(event) => setEditing({ ...editing, barcode: event.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Name</label>
              <input
                value={editing.name}
                onChange={(event) => setEditing({ ...editing, name: event.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Brand</label>
              <input
                value={editing.brand}
                onChange={(event) => setEditing({ ...editing, brand: event.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Category</label>
              <input
                value={editing.category}
                onChange={(event) => setEditing({ ...editing, category: event.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Image URL</label>
              <input
                value={editing.imageUrl}
                onChange={(event) => setEditing({ ...editing, imageUrl: event.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50"
              disabled={saving}
              onClick={saveEdit}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              className="border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
