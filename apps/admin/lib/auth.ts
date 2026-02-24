export const ADMIN_COOKIE_NAME = 'listacerta_admin_session';

const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'change-me-password';
const DEFAULT_SESSION_SECRET = 'listacerta-admin-session-secret';
const DEFAULT_COOKIE_SECURE = false;

export const getAdminCredentials = () => ({
  username: process.env.ADMIN_USERNAME?.trim() || DEFAULT_ADMIN_USERNAME,
  password: process.env.ADMIN_PASSWORD?.trim() || DEFAULT_ADMIN_PASSWORD,
});

const getSessionSecret = () => process.env.ADMIN_SESSION_SECRET?.trim() || DEFAULT_SESSION_SECRET;

const hash = (value: string) => {
  let result = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }

  return (result >>> 0).toString(16).padStart(8, '0');
};

const getExpectedSessionToken = () => {
  const { username, password } = getAdminCredentials();
  const payload = `${username}:${password}:${getSessionSecret()}`;
  const reversePayload = payload.split('').reverse().join('');

  return `v1_${hash(payload)}_${hash(reversePayload)}`;
};

export const isValidCredentials = (username: string, password: string) => {
  const credentials = getAdminCredentials();
  return username === credentials.username && password === credentials.password;
};

export const createSessionToken = () => ({
  token: getExpectedSessionToken(),
});

export const validateSessionToken = (token: string | null | undefined) => {
  if (!token) {
    return false;
  }

  return token === getExpectedSessionToken();
};

export const revokeSessionToken = (_token?: string) => {
  // Stateless auth cookie; nothing to revoke server-side for MVP.
};

export const shouldUseSecureCookies = () => {
  const raw = process.env.ADMIN_COOKIE_SECURE?.trim().toLowerCase();

  if (!raw) {
    return DEFAULT_COOKIE_SECURE;
  }

  return raw === '1' || raw === 'true' || raw === 'yes';
};
