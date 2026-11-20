import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StaffLoginFlow } from './StaffLoginFlow';
import { DemoLoginForm } from './DemoLoginForm';
import { isDemoMode } from '@/lib/demo/config';
import { demoRoleOptions, getDemoSessionProfileId } from '@/lib/demo/auth';

export const instant = false;

export default async function LoginPage() {
  if (isDemoMode()) {
    const existing = await getDemoSessionProfileId();
    if (existing) redirect('/dashboard');
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--hhh-space-lg)',
        }}
      >
        <div className="hhh-card" style={{ width: '100%', maxWidth: 400 }}>
          <h1 style={{ marginTop: 0, fontSize: '1.4rem' }}>Happy Healthy Hub</h1>
          <p style={{ color: 'var(--hhh-secondary-text)', marginTop: 0 }}>
            Sign in to the operations portal.
          </p>
          <DemoLoginForm options={demoRoleOptions()} />
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--hhh-space-lg)',
      }}
    >
      <div className="hhh-card" style={{ width: '100%', maxWidth: 400 }}>
        <h1 style={{ marginTop: 0, fontSize: '1.4rem' }}>Happy Healthy Hub</h1>
        <p style={{ color: 'var(--hhh-secondary-text)', marginTop: 0 }}>
          Sign in to the operations portal.
        </p>
        <StaffLoginFlow />
      </div>
    </div>
  );
}
