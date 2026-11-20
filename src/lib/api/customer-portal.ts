/**
 * Customer Portal API client — calls the customer-facing FastAPI endpoints.
 */

import { apiFetch } from './client';

export interface CustomerProfile {
  id: string;
  full_name: string;
  preferred_name: string | null;
  phone_number: string | null;
  email: string | null;
  city: string | null;
  status: string;
  profile_id: string | null;
  created_at: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  catalogue_type: string | null;
  base_price: number | null;
  is_active: boolean;
  display_order: number | null;
}

export interface CareRequestSummary {
  id: string;
  customer_id: string;
  status: string;
  urgency: string | null;
  notes: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface CareRequestWithItems {
  id: string;
  customer_id: string;
  status: string;
  urgency: string | null;
  notes: string | null;
  created_at: string;
  decided_at: string | null;
  items: Array<{
    id: string;
    service_id: string;
    quantity: number;
    service_name?: string;
  }>;
}

export async function apiEnsureProfile(): Promise<{ profile_id: string }> {
  return apiFetch<{ profile_id: string }>('/profiles/me', { method: 'POST' });
}

export async function apiListServices(): Promise<ServiceItem[]> {
  return apiFetch<ServiceItem[]>('/services');
}

export async function apiListMyRequests(customerId: string): Promise<CareRequestWithItems[]> {
  return apiFetch<CareRequestWithItems[]>('/care-requests/mine', {
    params: { customer_id: customerId },
  });
}

export async function apiGetMyCustomerProfile(): Promise<CustomerProfile | null> {
  try {
    const results = await apiFetch<CustomerProfile[]>('/customers', {
      params: { limit: 1 },
    });
    return results.length > 0 ? results[0] : null;
  } catch {
    return null;
  }
}
