import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadStaffSession } from '@/lib/auth';
import { apiListNotifications, type Notification } from '@/lib/api/notifications';
import { AdminShell } from '../components/AdminShell';
import { EmptyState } from '../components/EmptyState';

export const instant = false;

export default async function NotificationsPage() {
  const supabase = await createClient();
  const session = await loadStaffSession(supabase);
  if (!session) redirect('/login');
  if (!session.isCareStaff) redirect('/not-authorized');

  let notifications: Notification[] = [];
  let fetchError = false;
  try {
    notifications = await apiListNotifications();
  } catch (err) {
    console.error('Failed to load notifications:', err);
    fetchError = true;
  }

  return (
    <AdminShell title="Notifications" userEmail={session.email} isDemo={session.isDemo}>
      {fetchError ? (
        <EmptyState
          title="Could not load notifications"
          message="The notification service returned an error. Please try again later."
        />
      ) : notifications.length === 0 ? (
        <EmptyState
          title="You're all caught up"
          message="No notifications to show right now."
        />
      ) : (
        <div style={{ display: 'grid', gap: 'var(--hhh-space-sm)' }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              className="hhh-card"
              style={{
                borderLeft: n.is_read ? '3px solid var(--hhh-border)' : '3px solid var(--hhh-primary-teal)',
                opacity: n.is_read ? 0.75 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--hhh-space-md)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{n.title}</div>
                  {n.body && <div style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.9rem', marginTop: 4 }}>{n.body}</div>}
                </div>
                <div style={{ flexShrink: 0, fontSize: '0.8rem', color: 'var(--hhh-secondary-text)', whiteSpace: 'nowrap' }}>
                  {new Date(n.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--hhh-space-sm)', marginTop: 'var(--hhh-space-sm)' }}>
                <span className={`hhh-badge ${n.is_read ? 'hhh-badge--neutral' : 'hhh-badge--attention'}`}>
                  {n.is_read ? 'Read' : 'Unread'}
                </span>
                <span className="hhh-badge hhh-badge--neutral">{n.channel}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
