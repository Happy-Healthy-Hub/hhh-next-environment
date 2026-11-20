import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadProviderSession } from '@/lib/provider-auth';
import type { ProviderSession } from '@/lib/provider-auth';

export const instant = false;

export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let session: ProviderSession | null = null;
  try {
    session = await loadProviderSession();
  } catch (err) {
    console.error('Failed to load provider:', err);
    redirect('/login');
  }
  if (!session) redirect('/not-authorized');

  return <>{children}</>;
}
