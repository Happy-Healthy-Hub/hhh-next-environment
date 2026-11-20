import { apiFetch } from './client';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  channel: string;
  is_read: boolean;
  created_at: string;
}

export function apiListNotifications() {
  return apiFetch<Notification[]>('/notifications');
}

export function apiGetUnreadCount() {
  return apiFetch<{ count: number }>('/notifications/unread-count');
}

export function apiMarkRead(notificationId: string) {
  return apiFetch<void>(`/notifications/mark-read`, {
    method: 'POST',
    body: { notification_id: notificationId },
  });
}

export function apiMarkAllRead() {
  return apiFetch<void>('/notifications/mark-all-read', { method: 'POST' });
}
