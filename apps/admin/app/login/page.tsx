import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { ADMIN_COOKIE_NAME, getExpectedSessionToken, isValidCredentials } from '../../lib/auth';

type LoginPageProps = {
  searchParams?: {
    error?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  async function login(formData: FormData) {
    'use server';

    const username = String(formData.get('username') || '').trim();
    const password = String(formData.get('password') || '').trim();

    if (!isValidCredentials(username, password)) {
      redirect('/login?error=invalid');
    }

    cookies().set({
      name: ADMIN_COOKIE_NAME,
      value: getExpectedSessionToken(),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    redirect('/');
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
      <div className="card w-full space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Admin sign-in</h1>
          <p className="mt-1 text-sm text-slate-600">
            Sign in with your admin username and password.
          </p>
        </div>

        {searchParams?.error ? (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Invalid username or password. Please try again.
          </p>
        ) : null}

        <form action={login} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Username</label>
            <input name="username" type="text" required placeholder="admin" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <input name="password" type="password" required placeholder="••••••••" />
          </div>

          <button className="w-full bg-teal-700 text-white hover:bg-teal-800" type="submit">
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
