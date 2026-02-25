'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { apiFetch } from '../../../../lib/api';
import { Product } from '../../../../lib/types';

type ProductForm = {
  barcode: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string;
  source: 'OFF' | 'manual';
  isVerified: boolean;
};

export default function ProductEditPage() {
  const params = useParams<{ id: string }>();
  const productId = useMemo(() => String(params?.id ?? ''), [params]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [initialProduct, setInitialProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>({
    barcode: '',
    name: '',
    brand: '',
    category: '',
    imageUrl: '',
    source: 'manual',
    isVerified: false,
  });

  useEffect(() => {
    const load = async () => {
      if (!productId) {
        setError('Missing product ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const product = await apiFetch<Product>(`/products/id/${productId}`);
        setInitialProduct(product);
        setForm({
          barcode: product.barcode,
          name: product.name,
          brand: product.brand ?? '',
          category: product.category ?? '',
          imageUrl: product.imageUrl ?? '',
          source: product.source,
          isVerified: product.isVerified,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [productId]);

  const onSave = async () => {
    if (!productId) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const updated = await apiFetch<Product>(`/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({
          barcode: form.barcode.trim(),
          name: form.name.trim(),
          brand: form.brand.trim() || null,
          category: form.category.trim() || null,
          imageUrl: form.imageUrl.trim() || null,
          source: form.source,
          isVerified: form.isVerified,
        }),
      });

      setInitialProduct(updated);
      setForm({
        barcode: updated.barcode,
        name: updated.name,
        brand: updated.brand ?? '',
        category: updated.category ?? '',
        imageUrl: updated.imageUrl ?? '',
        source: updated.source,
        isVerified: updated.isVerified,
      });
      setSuccess('Product overrides saved successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Edit Product</h2>
          <p className="mt-1 text-sm text-slate-600">
            Override OpenFoodFacts values and mark product as verified.
          </p>
        </div>
        <Link
          href="/products"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Back to products
        </Link>
      </header>

      {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {success ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

      <section className="card space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading product…</p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Barcode</label>
                <input
                  value={form.barcode}
                  onChange={(event) => setForm((state) => ({ ...state, barcode: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Name</label>
                <input
                  value={form.name}
                  onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Brand</label>
                <input
                  value={form.brand}
                  onChange={(event) => setForm((state) => ({ ...state, brand: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Category</label>
                <input
                  value={form.category}
                  onChange={(event) => setForm((state) => ({ ...state, category: event.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Image URL</label>
                <input
                  value={form.imageUrl}
                  onChange={(event) => setForm((state) => ({ ...state, imageUrl: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Source</label>
                <select
                  value={form.source}
                  onChange={(event) =>
                    setForm((state) => ({ ...state, source: event.target.value as 'OFF' | 'manual' }))
                  }
                >
                  <option value="OFF">OFF</option>
                  <option value="manual">manual</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isVerified}
                    onChange={(event) => setForm((state) => ({ ...state, isVerified: event.target.checked }))}
                  />
                  Mark as verified
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Last updated:{' '}
                {initialProduct ? new Date(initialProduct.updatedAt).toLocaleString() : '—'}
              </p>
              <button
                type="button"
                className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                onClick={() => void onSave()}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save overrides'}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
