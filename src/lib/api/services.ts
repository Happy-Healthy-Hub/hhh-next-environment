/**
 * Service catalogue API calls via FastAPI backend.
 */

import { apiFetch } from './client';

export interface ApiService {
  id: string;
  name: string;
  description: string | null;
  catalogue_type: string;
  category: string | null;
  base_price: number | null;
  currency_code: string | null;
  price_unit: string | null;
  is_active: boolean;
}

export async function apiListServices(
  activeOnly?: boolean,
  catalogueType?: string,
  category?: string
): Promise<ApiService[]> {
  return apiFetch<ApiService[]>('/services', {
    params: {
      active_only: activeOnly,
      catalogue_type: catalogueType,
      category,
    },
  });
}
