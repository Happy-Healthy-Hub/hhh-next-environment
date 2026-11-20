/**
 * Customer session guard. Checks if the signed-in user has a customer
 * record linked to their profile. Returns customer data or null.
 */

import { createClient } from './supabase/server';

export interface CustomerSession {
  userId: string;
  email: string | null;
  customerId: string | null;
  customerName: string | null;
}

export async function loadCustomerSession(): Promise<CustomerSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: customer } = await supabase
    .from('customers')
    .select('id, full_name')
    .eq('profile_id', user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? null,
    customerId: customer?.id ?? null,
    customerName: customer?.full_name ?? null,
  };
}
