/**
 * Customer API calls via FastAPI backend.
 */

import { apiFetch } from './client';

export interface ApiCustomer {
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

export async function apiListCustomers(status?: string): Promise<ApiCustomer[]> {
  return apiFetch<ApiCustomer[]>('/customers', {
    params: { status },
  });
}

export async function apiGetCustomer(id: string): Promise<ApiCustomer> {
  return apiFetch<ApiCustomer>(`/customers/${id}`);
}

export async function apiCreateCustomer(data: {
  full_name: string;
  preferred_name?: string;
  phone_number?: string;
  email?: string;
  date_of_birth?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
}): Promise<{ customer_id: string }> {
  return apiFetch('/customers', { method: 'POST', body: data });
}

export async function apiSetCustomerStatus(
  id: string,
  newStatus: 'active' | 'inactive'
): Promise<void> {
  await apiFetch(`/customers/${id}/status`, {
    method: 'PATCH',
    body: { new_status: newStatus },
  });
}

export async function apiGetEmergencyContacts(customerId: string) {
  return apiFetch(`/customers/${customerId}/emergency-contacts`);
}

export async function apiGetFamilyRelationships(customerId: string) {
  return apiFetch(`/customers/${customerId}/family`);
}
