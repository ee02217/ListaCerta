import { ApiHttpError, priceApi } from '../network/apiClient';
import { priceRepository } from '../repositories/PriceRepository';

let isSyncing = false;

export const syncPendingPriceSubmissions = async (): Promise<{ synced: number; pending: number }> => {
  if (isSyncing) {
    const pending = await priceRepository.listPendingSubmissions(1_000);
    return { synced: 0, pending: pending.length };
  }

  isSyncing = true;

  try {
    const pendingItems = await priceRepository.listPendingSubmissions(1_000);
    let synced = 0;

    for (const item of pendingItems) {
      try {
        const response = await priceApi.submitPrice({
          productId: item.productId,
          storeId: item.storeId,
          priceCents: item.priceCents,
          currency: item.currency,
          capturedAt: item.capturedAt,
          photoUrl: item.photoUrl,
          idempotencyKey: item.idempotencyKey,
          submittedBy: item.submittedBy ?? undefined,
        });

        await priceRepository.upsertFromApiPrice(response.createdPrice);
        await priceRepository.upsertFromApiPrice(response.bestPrice);
        await priceRepository.removePendingSubmission(item.idempotencyKey);
        synced += 1;
      } catch (error) {
        if (error instanceof ApiHttpError && error.status >= 400 && error.status < 500) {
          // Bad payload should not be retried forever.
          await priceRepository.removePendingSubmission(item.idempotencyKey);
          continue;
        }

        await priceRepository.markPendingSubmissionFailed(
          item.idempotencyKey,
          error instanceof Error ? error.message : 'Unknown sync error',
        );
      }
    }

    const remaining = await priceRepository.listPendingSubmissions(1_000);
    return { synced, pending: remaining.length };
  } finally {
    isSyncing = false;
  }
};
