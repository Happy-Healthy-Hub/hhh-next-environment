import type { SupabaseClient } from '@supabase/supabase-js';
import { isDemoMode } from './demo/config';
import { demoListCustomers } from './demo/store';

/**
 * Customer domain types and parsing, mirroring the real `public.customers`
 * schema (re-read directly from the live project) and the trusted
 * `create_customer` / `set_customer_status` function bodies -- not the
 * mock-data layer's invented "incomplete" status, which does not exist in
 * the real database (`customers_status_check` allows only
 * `active`/`inactive`).
 */

export const CUSTOMER_STATUSES = ['active', 'inactive'] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

export const CUSTOMER_STATUS_BADGE_CLASS: Record<CustomerStatus, string> = {
  active: 'hhh-badge--positive',
  inactive: 'hhh-badge--neutral',
};

export function isCustomerStatus(value: string): value is CustomerStatus {
  return (CUSTOMER_STATUSES as readonly string[]).includes(value);
}

export interface Customer {
  id: string;
  fullName: string;
  preferredName: string | null;
  phoneNumber: string | null;
  email: string | null;
  city: string | null;
  status: CustomerStatus;
  /** Null means no signed-in app account is linked yet (see
   * `link_customer_profile`) -- a real, meaningful state, not missing data. */
  profileId: string | null;
  createdAt: string;
}

/** Only the columns this page shows -- never `select *`. */
export const CUSTOMER_SELECT =
  'id, full_name, preferred_name, phone_number, email, city, status, profile_id, created_at';

interface RawCustomerRow {
  id: unknown;
  full_name: unknown;
  preferred_name: unknown;
  phone_number: unknown;
  email: unknown;
  city: unknown;
  status: unknown;
  profile_id: unknown;
  created_at: unknown;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

export function parseCustomer(row: unknown): Customer {
  const r = row as RawCustomerRow;
  if (
    typeof r?.id !== 'string' ||
    typeof r?.full_name !== 'string' ||
    typeof r?.status !== 'string' ||
    !isCustomerStatus(r.status) ||
    typeof r?.created_at !== 'string'
  ) {
    throw new Error('Unexpected customer shape');
  }
  return {
    id: r.id,
    fullName: r.full_name,
    preferredName: asString(r.preferred_name),
    phoneNumber: asString(r.phone_number),
    email: asString(r.email),
    city: asString(r.city),
    status: r.status,
    profileId: asString(r.profile_id),
    createdAt: r.created_at,
  };
}

/**
 * The single place that decides which data source backs the Customers
 * page: the local Demo Mode store, or the real Supabase table. Every
 * other place in the app (pages, components) stays unaware of the
 * distinction -- see `demo/README.md` "Architecture".
 */
export async function fetchCustomers(supabase: SupabaseClient): Promise<Customer[]> {
  if (isDemoMode()) return demoListCustomers();
  const { data, error } = await supabase.from('customers').select(CUSTOMER_SELECT).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(parseCustomer);
}

export interface CustomerVital {
  id: string;
  recorderRole: string;
  systolicBp: number | null;
  diastolicBp: number | null;
  spo2Percent: number | null;
  pulseBpm: number | null;
  temperatureF: number | null;
  notes: string | null;
  recordedAt: string;
}

export interface CustomerProviderAssignment {
  id: string;
  status: string;
  providerOrgName: string;
  assignedAt: string;
  endedAt: string | null;
}

export interface CustomerDetail extends Customer {
  dateOfBirth: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  stateRegion: string | null;
  postalCode: string | null;
  countryCode: string | null;
  preferredLanguage: string | null;
  emergencyContacts: EmergencyContact[];
  familyRelationships: FamilyRelationship[];
  careRequests: CustomerCareRequest[];
  assignments: CustomerAssignment[];
  vitals: CustomerVital[];
  providerAssignments: CustomerProviderAssignment[];
}

export interface EmergencyContact {
  id: string;
  fullName: string;
  relationship: string | null;
  phoneNumber: string;
  alternatePhone: string | null;
  email: string | null;
  priority: number | null;
}

export interface FamilyRelationship {
  id: string;
  familyProfileName: string | null;
  relationshipLabel: string;
  status: string;
}

export interface CustomerCareRequest {
  id: string;
  status: string;
  createdAt: string;
  preferredStartDate: string | null;
}

export interface CustomerAssignment {
  id: string;
  caregiverName: string;
  status: string;
  assignedAt: string | null;
  endedAt: string | null;
}

const CUSTOMER_DETAIL_SELECT =
  'id, full_name, preferred_name, phone_number, email, city, status, profile_id, created_at, date_of_birth, address_line1, address_line2, state_region, postal_code, country_code, preferred_language';

export async function fetchCustomerDetail(
  supabase: SupabaseClient,
  customerId: string
): Promise<CustomerDetail | null> {
  if (isDemoMode()) {
    const all = demoListCustomers();
    const c = all.find((c) => c.id === customerId);
    if (!c) return null;
    return {
      ...c, dateOfBirth: null, addressLine1: null, addressLine2: null,
      stateRegion: null, postalCode: null, countryCode: null, preferredLanguage: null,
      emergencyContacts: [], familyRelationships: [], careRequests: [], assignments: [],
      vitals: [], providerAssignments: [],
    };
  }

  const { data: row, error } = await supabase
    .from('customers')
    .select(CUSTOMER_DETAIL_SELECT)
    .eq('id', customerId)
    .single();

  if (error || !row) return null;

  const base = parseCustomer(row);
  const r = row as Record<string, unknown>;

  const { data: ecRows } = await supabase
    .from('emergency_contacts')
    .select('id, full_name, relationship, phone_number, alternate_phone_number, email, priority')
    .eq('customer_id', customerId)
    .order('priority', { ascending: true });

  const emergencyContacts: EmergencyContact[] = (ecRows ?? []).map((ec: Record<string, unknown>) => ({
    id: ec.id as string,
    fullName: ec.full_name as string,
    relationship: (ec.relationship as string) ?? null,
    phoneNumber: ec.phone_number as string,
    alternatePhone: (ec.alternate_phone_number as string) ?? null,
    email: (ec.email as string) ?? null,
    priority: (ec.priority as number) ?? null,
  }));

  const { data: famRows } = await supabase
    .from('family_relationships')
    .select('id, family_profile:profiles!family_relationships_family_profile_id_fkey(display_name), relationship_label, status')
    .eq('customer_id', customerId);

  const familyRelationships: FamilyRelationship[] = (famRows ?? []).map((fr: Record<string, unknown>) => {
    const profile = fr.family_profile as Record<string, unknown> | null;
    return {
      id: fr.id as string,
      familyProfileName: profile ? (profile.display_name as string) : null,
      relationshipLabel: fr.relationship_label as string,
      status: fr.status as string,
    };
  });

  const { data: crRows } = await supabase
    .from('care_requests')
    .select('id, status, created_at, preferred_start_date')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(10);

  const careRequests: CustomerCareRequest[] = (crRows ?? []).map((cr: Record<string, unknown>) => ({
    id: cr.id as string,
    status: cr.status as string,
    createdAt: cr.created_at as string,
    preferredStartDate: (cr.preferred_start_date as string) ?? null,
  }));

  const { data: assignRows } = await supabase
    .from('care_assignments')
    .select('id, care_associate:care_associates!care_assignments_care_associate_id_fkey(public_display_name), status, assigned_at, ended_at, care_request:care_requests!care_assignments_care_request_id_fkey(customer_id)')
    .order('created_at', { ascending: false })
    .limit(20);

  const assignments: CustomerAssignment[] = (assignRows ?? [])
    .filter((a: Record<string, unknown>) => {
      const cr = a.care_request as Record<string, unknown> | null;
      return cr && cr.customer_id === customerId;
    })
    .slice(0, 10)
    .map((a: Record<string, unknown>) => {
      const cg = a.care_associate as Record<string, unknown> | null;
      return {
        id: a.id as string,
        caregiverName: cg ? (cg.public_display_name as string) : 'Unassigned',
        status: a.status as string,
        assignedAt: (a.assigned_at as string) ?? null,
        endedAt: (a.ended_at as string) ?? null,
      };
    });

  const { data: vitalRows } = await supabase
    .from('customer_vitals')
    .select('id, recorder_role, systolic_bp, diastolic_bp, spo2_percent, pulse_bpm, temperature_f, notes, recorded_at')
    .eq('customer_id', customerId)
    .order('recorded_at', { ascending: false })
    .limit(10);

  const vitals: CustomerVital[] = (vitalRows ?? []).map((v: Record<string, unknown>) => ({
    id: v.id as string,
    recorderRole: v.recorder_role as string,
    systolicBp: (v.systolic_bp as number) ?? null,
    diastolicBp: (v.diastolic_bp as number) ?? null,
    spo2Percent: (v.spo2_percent as number) ?? null,
    pulseBpm: (v.pulse_bpm as number) ?? null,
    temperatureF: (v.temperature_f as number) ?? null,
    notes: (v.notes as string) ?? null,
    recordedAt: v.recorded_at as string,
  }));

  const { data: provAssignRows } = await supabase
    .from('provider_assignments')
    .select('id, status, assigned_at, ended_at, provider_organizations(display_name), care_requests!inner(customer_id)')
    .order('assigned_at', { ascending: false })
    .limit(20);

  const providerAssignments: CustomerProviderAssignment[] = (provAssignRows ?? [])
    .filter((pa: Record<string, unknown>) => {
      const cr = pa.care_requests as Record<string, unknown> | null;
      return cr && cr.customer_id === customerId;
    })
    .slice(0, 10)
    .map((pa: Record<string, unknown>) => {
      const org = pa.provider_organizations as Record<string, unknown> | null;
      return {
        id: pa.id as string,
        status: pa.status as string,
        providerOrgName: org ? (org.display_name as string) : 'Unknown',
        assignedAt: pa.assigned_at as string,
        endedAt: (pa.ended_at as string) ?? null,
      };
    });

  return {
    ...base,
    dateOfBirth: (r.date_of_birth as string) ?? null,
    addressLine1: (r.address_line1 as string) ?? null,
    addressLine2: (r.address_line2 as string) ?? null,
    stateRegion: (r.state_region as string) ?? null,
    postalCode: (r.postal_code as string) ?? null,
    countryCode: (r.country_code as string) ?? null,
    preferredLanguage: (r.preferred_language as string) ?? null,
    emergencyContacts,
    familyRelationships,
    careRequests,
    assignments,
    vitals,
    providerAssignments,
  };
}
