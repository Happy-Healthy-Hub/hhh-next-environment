/**
 * Invoice & payment API calls via FastAPI backend.
 */

import { apiFetch } from './client';

export interface ApiInvoice {
  id: string;
  customer_id: string;
  status: string;
  currency_code: string;
  total_amount: number;
  issued_at: string | null;
  due_date: string | null;
  created_at: string;
}

export interface ApiInvoiceLine {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface ApiPayment {
  id: string;
  invoice_id: string;
  amount: number;
  currency_code: string;
  method: string;
  reference: string | null;
  received_at: string;
}

export async function apiListInvoices(
  status?: string,
  customerId?: string
): Promise<ApiInvoice[]> {
  return apiFetch<ApiInvoice[]>('/invoices', {
    params: { status, customer_id: customerId },
  });
}

export async function apiGetInvoice(id: string): Promise<ApiInvoice> {
  return apiFetch<ApiInvoice>(`/invoices/${id}`);
}

export async function apiCreateInvoice(data: {
  customer_id: string;
  currency_code?: string;
  due_date?: string;
}): Promise<{ invoice_id: string }> {
  return apiFetch('/invoices', { method: 'POST', body: data });
}

export async function apiAddInvoiceLine(
  invoiceId: string,
  data: {
    description: string;
    quantity: number;
    unit_price: number;
  }
): Promise<{ line_id: string }> {
  return apiFetch(`/invoices/${invoiceId}/lines`, { method: 'POST', body: data });
}

export async function apiListInvoiceLines(invoiceId: string): Promise<ApiInvoiceLine[]> {
  return apiFetch<ApiInvoiceLine[]>(`/invoices/${invoiceId}/lines`);
}

export async function apiIssueInvoice(id: string): Promise<void> {
  await apiFetch(`/invoices/${id}/issue`, { method: 'POST' });
}

export async function apiVoidInvoice(id: string): Promise<void> {
  await apiFetch(`/invoices/${id}/void`, { method: 'POST' });
}

export async function apiListPayments(invoiceId: string): Promise<ApiPayment[]> {
  return apiFetch<ApiPayment[]>(`/invoices/${invoiceId}/payments`);
}

export async function apiRecordPayment(
  invoiceId: string,
  data: {
    amount: number;
    currency_code?: string;
    method: string;
    reference?: string;
    received_at?: string;
  }
): Promise<{ payment_id: string }> {
  return apiFetch(`/invoices/${invoiceId}/payments`, { method: 'POST', body: data });
}
