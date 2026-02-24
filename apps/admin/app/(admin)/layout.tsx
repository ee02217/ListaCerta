import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

import { ADMIN_COOKIE_NAME, getExpectedSessionToken } from '../../lib/auth';

export default function AdminLayout({ children }: { children: ReactNode }) {
  async function logout() {
    'use server';

    cookies().delete(ADMIN_COOKIE_NAME);
    redirect('/login');
  }

  const cookieToken = cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (cookieToken !== getExpectedSessionToken()) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-0 md:grid-cols-[240px_1fr]">
        <aside className="border-b border-slate-200 bg-white p-4 md:border-b-0 md:border-r">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-wider text-slate-500">ListaCerta</p>
            <h1 className="text-lg font-semibold">Admin Portal</h1>
          </div>

          <nav className="space-y-1 text-sm">
            <Link className="block rounded-md px-3 py-2 hover:bg-slate-100" href="/">
              Dashboard
            </Link>
            <Link className="block rounded-md px-3 py-2 hover:bg-slate-100" href="/products">
              Products
            </Link>
            <Link className="block rounded-md px-3 py-2 hover:bg-slate-100" href="/stores">
              Stores
            </Link>
            <Link className="block rounded-md px-3 py-2 hover:bg-slate-100" href="/prices">
              Prices moderation
            </Link>
          </nav>

          <form action={logout} className="mt-8">
            <button className="w-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-100" type="submit">
              Sign out
            </button>
          </form>
        </aside>

        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
