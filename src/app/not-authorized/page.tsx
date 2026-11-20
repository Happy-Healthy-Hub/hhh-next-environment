import { createClient } from '@/lib/supabase/server';
import { AppShell } from '../components/AppShell';

export const instant = false;

export default async function NotAuthorizedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AppShell title="This account can't use the operations portal" userEmail={user?.email ?? null}>
      <p>
        Your account is signed in, but it doesn&apos;t hold a care coordinator,
        operations manager or administrator role. If this isn&apos;t right,
        please contact an administrator.
      </p>
    </AppShell>
  );
}
