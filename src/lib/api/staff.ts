/**
 * Staff API calls via FastAPI backend.
 * The backend uses its service-role key to include emails from auth.users,
 * which the direct Supabase client cannot access.
 */

import { apiFetch } from './client';
import type { StaffRoleKey } from '../staff';

export interface ApiStaffMember {
  profile_id: string;
  display_name: string | null;
  email: string | null;
  account_status: string;
  roles: string[];
}

export interface ApiAuditEvent {
  id: string;
  occurred_at: string;
  actor_profile_id: string | null;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
}

export async function apiListStaff(): Promise<ApiStaffMember[]> {
  return apiFetch<ApiStaffMember[]>('/staff');
}

export async function apiGrantRole(profileId: string, roleKey: StaffRoleKey): Promise<void> {
  await apiFetch(`/staff/${profileId}/roles`, {
    method: 'POST',
    body: { role_key: roleKey },
  });
}

export async function apiRevokeRole(profileId: string, roleKey: StaffRoleKey): Promise<void> {
  await apiFetch(`/staff/${profileId}/roles/${roleKey}`, {
    method: 'DELETE',
  });
}

export async function apiSetStaffStatus(
  profileId: string,
  status: 'active' | 'deactivated'
): Promise<void> {
  await apiFetch(`/staff/${profileId}/status`, {
    method: 'PATCH',
    body: { new_status: status },
  });
}

export async function apiInviteStaff(email: string, roles: StaffRoleKey[]): Promise<void> {
  await apiFetch('/staff/invite', {
    method: 'POST',
    body: { email, roles },
  });
}

export async function apiListAuditLog(): Promise<ApiAuditEvent[]> {
  return apiFetch<ApiAuditEvent[]>('/staff/audit-log');
}
