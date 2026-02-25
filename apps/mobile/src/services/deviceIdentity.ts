import { getDatabase } from '../db/client';

const DEVICE_IDENTITY_KEY = 'anonymous_device_id';

type IdentityRow = {
  value: string;
};

const generateUuid = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });

export const getOrCreateDeviceId = async (): Promise<string> => {
  const db = await getDatabase();

  const existing = await db.getFirstAsync<IdentityRow>(
    'SELECT value FROM app_identity WHERE key = ? LIMIT 1;',
    [DEVICE_IDENTITY_KEY],
  );

  if (existing?.value) {
    return existing.value;
  }

  const now = new Date().toISOString();
  const deviceId = generateUuid();

  await db.runAsync(
    'INSERT INTO app_identity (key, value, created_at, updated_at) VALUES (?, ?, ?, ?);',
    [DEVICE_IDENTITY_KEY, deviceId, now, now],
  );

  return deviceId;
};
