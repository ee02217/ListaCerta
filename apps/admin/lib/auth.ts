import { createAdminSession, deleteSession, getSession } from './session';

export const ADMIN_COOKIE_NAME = 'listacerta_admin_session';

const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'change-me-password';
const DEFAULT_COOKIE_SECURE = false;
const DEFAULT_SESSION_TTL = 1000 * 60 * 60 * 12; // 12h

export const getAdminCredentials = () => ({
  username: process.env.ADMIN_USERNAME?.trim() || DEFAULT_ADMIN_USERNAME,
  password: process.env.ADMIN_PASSWORD?.trim() || DEFAULT_ADMIN_PASSWORD,
});

export const isValidCredentials = (username: string, password: string) => {
  const credentials = getAdminCredentials();
  return username === credentials.username && password === credentials.password;
};

export const createSessionToken = (username: string) => createAdminSession(username, DEFAULT_SESSION_TTL);

export const validateSessionToken = (token: string | null | undefined) => {
  if (!token) {
    return null;
  }

  return getSession(token);
};

export const revokeSessionToken = (token?: string) => {
  if (!token) {
    return;
  }

  deleteSession(token);
};

export const shouldUseSecureCookies = () => {
  const raw = process.env.ADMIN_COOKIE_SECURE?.trim().toLowerCase();

  if (!raw) {
    return DEFAULT_COOKIE_SECURE;
  }

  return raw === '1' || raw === 'true' || raw === 'yes';
};
