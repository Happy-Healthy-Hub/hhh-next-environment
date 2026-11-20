/**
 * Care request domain types and pure logic, mirroring the Flutter app's
 * lib/features/care_requests/domain/care_request.dart exactly (same
 * database columns, same status values, same allowed-cancel rule) so the
 * two clients never disagree about what the backend allows.
 *
 * Re-read directly from supabase/migrations/001_initial_core_mvp_schema.sql
 * (the submit_care_request / start_care_request_review / decide_care_request
 * function bodies) before writing this file.
 */

export const CARE_REQUEST_STATUSES = [
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'cancelled',
] as const;

export type CareRequestStatus = (typeof CARE_REQUEST_STATUSES)[number];

export const STATUS_LABELS: Record<CareRequestStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Being reviewed',
  approved: 'Approved',
  rejected: 'Not approved',
  cancelled: 'Cancelled',
};

/** `.hhh-badge--*` CSS class per status, matching the Flutter app's
 * StatusTone mapping (toneForCareRequestStatus). */
export const STATUS_BADGE_CLASS: Record<CareRequestStatus, string> = {
  submitted: 'hhh-badge--neutral',
  under_review: 'hhh-badge--attention',
  approved: 'hhh-badge--positive',
  rejected: 'hhh-badge--critical',
  cancelled: 'hhh-badge--neutral',
};

export function isCareRequestStatus(value: string): value is CareRequestStatus {
  return (CARE_REQUEST_STATUSES as readonly string[]).includes(value);
}

/** Only `start_care_request_review` allows this — `status = 'submitted'`. */
export function canStartReview(status: CareRequestStatus): boolean {
  return status === 'submitted';
}

/** Only `decide_care_request` allows this — `status = 'under_review'`. */
export function canDecide(status: CareRequestStatus): boolean {
  return status === 'under_review';
}

export interface CareRequestItem {
  serviceId: string;
  serviceName: string;
  quantity: number;
  notes: string | null;
  basePrice: number | null;
  currencyCode: string | null;
  priceUnit: string | null;
}

export interface CareRequestCustomer {
  id: string;
  fullName: string;
  preferredName: string | null;
  phoneNumber: string | null;
  email: string | null;
}

/** A row from `care_requests`, joined to its items/services and customer
 * for display. Only the columns the portal actually shows are read —
 * deliberately not `select *`, so a future sensitive column added to the
 * table doesn't silently start appearing here. */
export interface CareRequest {
  id: string;
  status: CareRequestStatus;
  preferredStartDate: string;
  preferredEndDate: string | null;
  preferredTimeOfDay: string | null;
  scheduleNotes: string | null;
  customerNotes: string | null;
  decisionReason: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  customer: CareRequestCustomer;
  items: CareRequestItem[];
}

/** Exact select shape sent to Supabase. Keep in sync with the Dart
 * repository's `CareRequest.columns`; the two must read the same thing. */
export const CARE_REQUEST_SELECT = `
  id, status, preferred_start_date, preferred_end_date, preferred_time_of_day,
  schedule_notes, customer_notes, decision_reason, cancellation_reason,
  created_at, updated_at,
  customers!inner(id, full_name, preferred_name, phone_number, email),
  care_request_items(service_id, quantity, notes,
    services(name, base_price, currency_code, price_unit))
`;

interface RawCareRequestRow {
  id: unknown;
  status: unknown;
  preferred_start_date: unknown;
  preferred_end_date: unknown;
  preferred_time_of_day: unknown;
  schedule_notes: unknown;
  customer_notes: unknown;
  decision_reason: unknown;
  cancellation_reason: unknown;
  created_at: unknown;
  updated_at: unknown;
  customers: unknown;
  care_request_items: unknown;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Throws rather than guessing when the shape doesn't match what the app
 * expects — the same discipline as the Flutter models' `fromJson`. */
export function parseCareRequest(row: unknown): CareRequest {
  const r = row as RawCareRequestRow;
  if (
    typeof r?.id !== 'string' ||
    typeof r?.status !== 'string' ||
    !isCareRequestStatus(r.status) ||
    typeof r?.preferred_start_date !== 'string' ||
    typeof r?.created_at !== 'string' ||
    typeof r?.updated_at !== 'string'
  ) {
    throw new Error('Unexpected care request shape');
  }
  const customerRaw = (
    Array.isArray(r.customers) ? r.customers[0] : r.customers
  ) as Record<string, unknown> | undefined;
  if (!customerRaw || typeof customerRaw.id !== 'string' || typeof customerRaw.full_name !== 'string') {
    throw new Error('Unexpected care request customer shape');
  }
  const itemsRaw = Array.isArray(r.care_request_items) ? r.care_request_items : [];

  return {
    id: r.id,
    status: r.status,
    preferredStartDate: r.preferred_start_date,
    preferredEndDate: asString(r.preferred_end_date),
    preferredTimeOfDay: asString(r.preferred_time_of_day),
    scheduleNotes: asString(r.schedule_notes),
    customerNotes: asString(r.customer_notes),
    decisionReason: asString(r.decision_reason),
    cancellationReason: asString(r.cancellation_reason),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    customer: {
      id: customerRaw.id,
      fullName: customerRaw.full_name,
      preferredName: asString(customerRaw.preferred_name),
      phoneNumber: asString(customerRaw.phone_number),
      email: asString(customerRaw.email),
    },
    items: itemsRaw.map((item) => {
      const i = item as Record<string, unknown>;
      const service = i.services as Record<string, unknown> | undefined;
      const name = typeof service?.name === 'string' ? service.name : null;
      if (typeof i.service_id !== 'string' || typeof i.quantity !== 'number' || !name) {
        throw new Error('Unexpected care request item shape');
      }
      return {
        serviceId: i.service_id,
        serviceName: name,
        quantity: i.quantity,
        notes: asString(i.notes),
        basePrice: asNumber(service?.base_price),
        currencyCode: asString(service?.currency_code),
        priceUnit: asString(service?.price_unit),
      };
    }),
  };
}

/** For example "₹1,500 per visit", or null when no price is listed —
 * mirrors CareService.formatAmount / priceLabel in the Flutter app. A
 * zero price is treated as "not listed" for the same reason: the schema
 * allows it, but nothing says whether it means free or not yet priced. */
export function formatPriceLabel(
  item: Pick<CareRequestItem, 'basePrice' | 'currencyCode' | 'priceUnit'>
): string | null {
  if (item.basePrice === null || item.basePrice <= 0) return null;
  if (!item.currencyCode || !item.priceUnit) return null;
  const unitLabel: Record<string, string> = {
    per_visit: 'per visit',
    per_hour: 'per hour',
    per_day: 'per day',
  };
  const label = unitLabel[item.priceUnit];
  if (!label) return null;
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: item.currencyCode,
    currencyDisplay: item.currencyCode === 'INR' ? 'symbol' : 'code',
    maximumFractionDigits: Number.isInteger(item.basePrice) ? 0 : 2,
  });
  return `${formatter.format(item.basePrice)} ${label}`;
}

export { asNumber as parsePriceForTesting };

// --- Repository (real Supabase or Local Demo Mode) -------------------------

import type { SupabaseClient } from '@supabase/supabase-js';
import { isDemoMode } from './demo/config';
import { demoListCareRequestRows } from './demo/store';

/** See `customers.ts#fetchCustomers` for the same real-vs-demo pattern. */
export async function fetchCareRequests(supabase: SupabaseClient): Promise<CareRequest[]> {
  if (isDemoMode()) return demoListCareRequestRows().map(parseCareRequest);
  const { data, error } = await supabase
    .from('care_requests')
    .select(CARE_REQUEST_SELECT)
    .order('status', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(parseCareRequest);
}

export async function fetchCareRequest(supabase: SupabaseClient, id: string): Promise<CareRequest | null> {
  if (isDemoMode()) {
    const row = demoListCareRequestRows().find((r) => r.id === id);
    return row ? parseCareRequest(row) : null;
  }
  const { data, error } = await supabase.from('care_requests').select(CARE_REQUEST_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? parseCareRequest(data) : null;
}
