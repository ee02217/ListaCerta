import { SQLiteDatabase, openDatabaseAsync } from 'expo-sqlite';

const DATABASE_NAME = 'listacerta.db';

let databasePromise: Promise<SQLiteDatabase> | null = null;

export const getDatabase = async (): Promise<SQLiteDatabase> => {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync(DATABASE_NAME);
  }

  return databasePromise;
};
