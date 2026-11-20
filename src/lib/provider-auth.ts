/**
 * Provider session guard. Calls /providers/me via FastAPI to confirm the
 * signed-in user is an active provider member. Returns their membership
 * and organisation data, or null if they're not a provider.
 */

import { apiGetMyMembership, apiGetMyOrganization } from './api/provider-portal';
import type { ProviderMembership, ProviderOrganization } from './api/provider-portal';
import { ApiError } from './api/client';

export interface ProviderSession {
  membership: ProviderMembership;
  organization: ProviderOrganization;
  isProviderAdmin: boolean;
}

export async function loadProviderSession(): Promise<ProviderSession | null> {
  try {
    const [membership, organization] = await Promise.all([
      apiGetMyMembership(),
      apiGetMyOrganization(),
    ]);
    return {
      membership,
      organization,
      isProviderAdmin: membership.org_role === 'provider_admin',
    };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 401)) {
      return null;
    }
    throw err;
  }
}
