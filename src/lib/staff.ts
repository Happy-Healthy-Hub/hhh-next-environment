/**
 * Staff & Access domain types. Built against the live schema: `public.roles`
 * (the catalogue, `is_staff` flag), `public.user_roles` (readable for
 * every user's own rows, or every row for an administrator --
 * `user_roles_select` RLS), `public.profiles` (readable for every care
 * staff account -- `profiles_select` RLS) and `public.audit_events`
 * (administrator-only -- `audit_events_select` RLS).
 *
 * Known, documented gap: there is no email column anywhere in `public`
 * for another user -- `auth.users` is not exposed to the client, and no
 * admin API is available from a browser session. The staff list below
 * shows display name and role only; see OPERATIONS_API_REQUIREMENTS.md
 * "Staff / Roles / Permissions" for why a future API layer is needed for
 * this.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { isDemoMode } from './demo/config';
import { demoListStaff, demoListAuditEvents } from './demo/store';

export const STAFF_ROLE_KEYS = ['care_coordinator', 'operations_manager', 'administrator'] as const;
export type StaffRoleKey = (typeof STAFF_ROLE_KEYS)[number];

export const STAFF_ROLE_LABELS: Record<StaffRoleKey, string> = {
  care_coordinator: 'Coordinator',
  operations_manager: 'Operations manager',
  administrator: 'Administrator',
};

export function isStaffRoleKey(value: string): value is StaffRoleKey {
  return (STAFF_ROLE_KEYS as readonly string[]).includes(value);
}

export interface StaffMember {
  profileId: string;
  displayName: string | null;
  email: string | null;
  accountStatus: 'active' | 'deactivated';
  roles: StaffRoleKey[];
  isSelf: boolean;
}

export interface AuditEvent {
  id: string;
  occurredAt: string;
  actorProfileId: string | null;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
}

export const AUDIT_EVENT_SELECT = 'id, occurred_at, actor_profile_id, event_type, entity_type, entity_id';

export function parseAuditEvent(row: unknown): AuditEvent {
  const r = row as Record<string, unknown>;
  if (typeof r?.id !== 'string' || typeof r?.occurred_at !== 'string' || typeof r?.event_type !== 'string') {
    throw new Error('Unexpected audit event shape');
  }
  return {
    id: r.id,
    occurredAt: r.occurred_at,
    actorProfileId: typeof r.actor_profile_id === 'string' ? r.actor_profile_id : null,
    eventType: r.event_type,
    entityType: typeof r.entity_type === 'string' ? r.entity_type : null,
    entityId: typeof r.entity_id === 'string' ? r.entity_id : null,
  };
}

/**
 * Builds the staff list by joining profiles that hold at least one staff
 * role with the full set of roles each holds. Pure function so the
 * join/shape logic is unit-testable without a live database.
 */
export function buildStaffList(
  profiles: { id: string; display_name: string | null; account_status: string }[],
  userRoles: { user_id: string; role_key: string }[],
  currentUserId: string
): StaffMember[] {
  const rolesByUser = new Map<string, StaffRoleKey[]>();
  for (const row of userRoles) {
    if (!isStaffRoleKey(row.role_key)) continue;
    const list = rolesByUser.get(row.user_id) ?? [];
    list.push(row.role_key);
    rolesByUser.set(row.user_id, list);
  }
  return profiles
    .filter((p) => (rolesByUser.get(p.id) ?? []).length > 0)
    .map((p) => ({
      profileId: p.id,
      displayName: p.display_name,
      email: null,
      accountStatus: p.account_status === 'deactivated' ? 'deactivated' : 'active',
      roles: rolesByUser.get(p.id) ?? [],
      isSelf: p.id === currentUserId,
    }));
}

/** See `customers.ts#fetchCustomers` for the same real-vs-demo pattern. */
export async function fetchStaff(supabase: SupabaseClient, currentUserId: string): Promise<StaffMember[]> {
  if (isDemoMode()) return demoListStaff(currentUserId);
  const [profilesResult, rolesResult] = await Promise.all([
    supabase.from('profiles').select('id, display_name, account_status'),
    supabase.from('user_roles').select('user_id, role_key'),
  ]);
  if (profilesResult.error) throw profilesResult.error;
  if (rolesResult.error) throw rolesResult.error;
  return buildStaffList(profilesResult.data ?? [], rolesResult.data ?? [], currentUserId);
}

export async function fetchAuditEvents(supabase: SupabaseClient): Promise<AuditEvent[]> {
  if (isDemoMode()) return demoListAuditEvents();
  const { data, error } = await supabase
    .from('audit_events')
    .select(AUDIT_EVENT_SELECT)
    .order('occurred_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map(parseAuditEvent);
}
