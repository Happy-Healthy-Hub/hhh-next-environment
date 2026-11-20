import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadStaffSession } from '@/lib/auth';
import { AdminShell } from '../components/AdminShell';
import { ErrorState } from '../components/ErrorState';
import { CustomersPanel } from '../components/CustomersPanel';
import { fetchCustomers } from '@/lib/customers';

export const instant = false;

/**
 * Customers (AD14-26), wired to the real backend (or, in Local Demo
 * Mode, the local demo store -- see `fetchCustomers`). `customers_select`
 * RLS grants every care-staff account full visibility -- the same
 * existing, not newly invented, rule `/requests` already relies on.
 * List and status change only; full profile editing, document review and
 * the activity tab are not built (AD16-21, AD25, AD26) -- the approved
 * design itself leaves "edit or only review submitted data" as an open
 * decision, and no trusted function exists for staff to edit arbitrary
 * customer fields.
 */
export default async function CustomersPage() {
  const supabase = await createClient();
  const session = await loadStaffSession(supabase);
  if (!session) redirect('/login');
  if (!session.isCareStaff) redirect('/not-authorized');

  let customers;
  try {
    customers = await fetchCustomers(supabase);
  } catch (err) {
    console.error('Failed to load customers:', err);
    return (
      <AdminShell title="Customers" userEmail={session.email} isDemo={session.isDemo}>
        <ErrorState message="Something went wrong loading customers. Please try reloading the page." />
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Customers" userEmail={session.email} isDemo={session.isDemo}>
      <CustomersPanel customers={customers} />
    </AdminShell>
  );
}
