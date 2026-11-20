'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/demo/config';
import { getDemoSessionProfileId } from '@/lib/demo/auth';
import { demoCreateCustomer, demoSetCustomerStatus, DemoStateError } from '@/lib/demo/store';
import type { ActionResult } from '../requests/[id]/actions';

/** Calls the trusted `create_customer` function (or, in Local Demo Mode,
 * the local demo store). Creates a bare record with no linked sign-in
 * account -- linking happens separately through `link_customer_profile`
 * once the customer signs up in the app (not built in this portal yet;
 * see OPERATIONS_API_REQUIREMENTS.md). */
export async function createCustomerAction(input: {
  fullName: string;
  phoneNumber: string | null;
  dateOfBirth: string | null;
}): Promise<ActionResult> {
  if (isDemoMode()) {
    try {
      demoCreateCustomer(input, (await getDemoSessionProfileId()) ?? '');
    } catch (err) {
      return { ok: false, message: err instanceof DemoStateError ? err.message : 'Something went wrong.' };
    }
    revalidatePath('/customers');
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc('create_customer', {
    p_full_name: input.fullName,
    p_phone_number: input.phoneNumber,
    p_date_of_birth: input.dateOfBirth,
  });
  if (error) return { ok: false, message: mapError(error.code) };
  revalidatePath('/customers');
  return { ok: true };
}

/** Calls the trusted `set_customer_status` function (or, in Local Demo
 * Mode, the local demo store) -- the only two real statuses are
 * `active`/`inactive`; there is no "incomplete" status in the database. */
export async function setCustomerStatusAction(
  customerId: string,
  status: 'active' | 'inactive'
): Promise<ActionResult> {
  if (isDemoMode()) {
    try {
      demoSetCustomerStatus(customerId, status, (await getDemoSessionProfileId()) ?? '');
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Something went wrong.' };
    }
    revalidatePath('/customers');
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_customer_status', {
    p_customer_id: customerId,
    p_status: status,
  });
  if (error) return { ok: false, message: mapError(error.code) };
  revalidatePath('/customers');
  return { ok: true };
}

function mapError(code: string | undefined): string {
  switch (code) {
    case '42501':
      return "You don't have permission to do that.";
    case '22023':
      return 'Check the values entered -- something is not valid.';
    case 'P0002':
      return 'This customer could not be found.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
