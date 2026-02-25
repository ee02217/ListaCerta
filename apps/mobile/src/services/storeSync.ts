import { storeApi } from '../network/apiClient';
import { storeRepository } from '../repositories/StoreRepository';

export const syncStoresToLocal = async (): Promise<{ synced: number }> => {
  const stores = await storeApi.listStores();
  await storeRepository.upsertManyFromApi(stores);
  return { synced: stores.length };
};
