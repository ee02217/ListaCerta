import { Injectable, Logger } from '@nestjs/common';

type OpenFoodFactsResponse = {
  status: number;
  product?: {
    product_name?: string;
    product_name_en?: string;
    brands?: string;
    categories?: string;
    categories_tags?: string[];
    image_url?: string;
    image_front_url?: string;
  };
};

export type OpenFoodFactsProduct = {
  barcode: string;
  name: string;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
};

@Injectable()
export class OpenFoodFactsService {
  private readonly logger = new Logger(OpenFoodFactsService.name);
  private readonly baseUrl = process.env.OFF_BASE_URL ?? 'https://world.openfoodfacts.org';

  async fetchProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
    const url = `${this.baseUrl}/api/v2/product/${barcode}.json`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ListaCerta/0.1 (https://github.com/ee02217/ListaCerta)',
        },
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as OpenFoodFactsResponse;

      if (payload.status !== 1 || !payload.product) {
        return null;
      }

      const productName = this.clean(payload.product.product_name ?? payload.product.product_name_en);
      if (!productName) {
        return null;
      }

      const brands = this.clean(payload.product.brands);
      const primaryBrand = brands ? brands.split(',')[0]?.trim() : null;
      const rawCategory = payload.product.categories_tags?.[0] ?? payload.product.categories ?? null;
      const normalizedCategory = rawCategory?.replace(/^[a-z]{2}:/i, '').replace(/-/g, ' ') ?? null;

      return {
        barcode,
        name: productName,
        brand: this.clean(primaryBrand),
        category: this.clean(normalizedCategory),
        imageUrl: this.clean(payload.product.image_url ?? payload.product.image_front_url),
      };
    } catch (error) {
      this.logger.warn(`OpenFoodFacts fetch failed for barcode ${barcode}`);
      this.logger.debug(error);
      return null;
    }
  }

  private clean(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
}
