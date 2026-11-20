import { describe, expect, test } from 'vitest';
import {
  canDecide,
  canStartReview,
  formatPriceLabel,
  isCareRequestStatus,
  parseCareRequest,
} from '../care-requests';

const row = {
  id: 'r1',
  status: 'submitted',
  preferred_start_date: '2026-11-01',
  preferred_end_date: null,
  preferred_time_of_day: 'morning',
  schedule_notes: null,
  customer_notes: 'Please call ahead.',
  decision_reason: null,
  cancellation_reason: null,
  created_at: '2026-10-20T10:00:00+00:00',
  updated_at: '2026-10-20T10:00:00+00:00',
  customers: {
    id: 'c1',
    full_name: 'Asha Devi Rao',
    preferred_name: null,
    phone_number: '+919876543210',
    email: null,
  },
  care_request_items: [
    {
      service_id: 's1',
      quantity: 1,
      notes: null,
      services: {
        name: 'Companion visit',
        base_price: 1500,
        currency_code: 'INR',
        price_unit: 'per_visit',
      },
    },
  ],
};

describe('isCareRequestStatus', () => {
  test('accepts the five real statuses and rejects anything else', () => {
    expect(isCareRequestStatus('submitted')).toBe(true);
    expect(isCareRequestStatus('under_review')).toBe(true);
    expect(isCareRequestStatus('made_up')).toBe(false);
  });
});

describe('canStartReview / canDecide', () => {
  // Mirrors start_care_request_review / decide_care_request's own status
  // checks exactly (supabase/migrations/001_initial_core_mvp_schema.sql).
  test('only a submitted request can start review', () => {
    expect(canStartReview('submitted')).toBe(true);
    for (const status of ['under_review', 'approved', 'rejected', 'cancelled'] as const) {
      expect(canStartReview(status)).toBe(false);
    }
  });

  test('only an under-review request can be decided', () => {
    expect(canDecide('under_review')).toBe(true);
    for (const status of ['submitted', 'approved', 'rejected', 'cancelled'] as const) {
      expect(canDecide(status)).toBe(false);
    }
  });
});

describe('parseCareRequest', () => {
  test('parses a full row with its customer and items', () => {
    const request = parseCareRequest(row);
    expect(request.status).toBe('submitted');
    expect(request.customer.fullName).toBe('Asha Devi Rao');
    expect(request.items).toHaveLength(1);
    expect(request.items[0].serviceName).toBe('Companion visit');
    expect(request.items[0].basePrice).toBe(1500);
  });

  test('rejects an unrecognised status rather than guessing', () => {
    expect(() => parseCareRequest({ ...row, status: 'made_up' })).toThrow();
  });

  test('rejects a row with no customer', () => {
    expect(() => parseCareRequest({ ...row, customers: null })).toThrow();
  });

  test('handles a customer row returned as an array (PostgREST embed shape)', () => {
    const request = parseCareRequest({ ...row, customers: [row.customers] });
    expect(request.customer.fullName).toBe('Asha Devi Rao');
  });

  test('treats blank optional fields as missing', () => {
    const request = parseCareRequest({ ...row, schedule_notes: '  ' });
    expect(request.scheduleNotes).toBeNull();
  });
});

describe('formatPriceLabel', () => {
  test('formats a listed price with its unit', () => {
    expect(
      formatPriceLabel({ basePrice: 1500, currencyCode: 'INR', priceUnit: 'per_visit' })
    ).toBe('₹1,500 per visit');
  });

  test('a zero price is treated as not listed, not free', () => {
    expect(formatPriceLabel({ basePrice: 0, currencyCode: 'INR', priceUnit: 'per_visit' })).toBeNull();
  });

  test('a missing currency or unit yields no label', () => {
    expect(formatPriceLabel({ basePrice: 100, currencyCode: null, priceUnit: 'per_visit' })).toBeNull();
    expect(formatPriceLabel({ basePrice: 100, currencyCode: 'INR', priceUnit: null })).toBeNull();
  });

  test('an unrecognised price unit yields no label rather than guessing', () => {
    expect(
      formatPriceLabel({ basePrice: 100, currencyCode: 'INR', priceUnit: 'per_month' })
    ).toBeNull();
  });
});
