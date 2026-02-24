import crypto from 'crypto';

const sessions = new Map<string, { username: string; expiresAt: number }>();
const DEFAULT_SESSION_TTL = 1000 * 60 * 60 * 12; // 12h

export const createAdminSession = (username: string, ttl = DEFAULT_SESSION_TTL): { token: string; expiresAt: number } => {
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + ttl;
  sessions.set(token, { username, expiresAt });
  return { token, expiresAt };
};

export const getSession = (token: string) => {
  const session = sessions.get(token);
  if (!session) {
    return null;
  }

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }

  return session;
};

export const deleteSession = (token: string) => {
  sessions.delete(token);
};
