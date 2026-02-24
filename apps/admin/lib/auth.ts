export const ADMIN_COOKIE_NAME = 'listacerta_admin_token';

export const getAdminToken = (): string => {
  return process.env.ADMIN_TOKEN?.trim() || 'changeme-admin-token';
};
