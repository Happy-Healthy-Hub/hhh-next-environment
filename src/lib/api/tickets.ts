/**
 * Support ticket API calls via FastAPI backend.
 */

import { apiFetch } from './client';

export interface ApiTicketSummary {
  id: string;
  ticket_number: string;
  requester_profile_id: string;
  requester_role: string;
  category: string;
  priority: string;
  status: string;
  subject: string;
  assigned_to_profile_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiTicketDetail extends ApiTicketSummary {
  description: string;
  resolved_at: string | null;
  closed_at: string | null;
}

export interface ApiTicketMessage {
  id: string;
  ticket_id: string;
  author_profile_id: string;
  author_role: string;
  body: string;
  is_internal: boolean;
  created_at: string;
}

export const TICKET_STATUSES = [
  'open',
  'in_progress',
  'waiting_customer',
  'resolved',
  'closed',
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export async function apiListTickets(status?: string): Promise<ApiTicketSummary[]> {
  return apiFetch<ApiTicketSummary[]>('/tickets', { params: { status } });
}

export async function apiGetTicket(id: string): Promise<ApiTicketDetail> {
  return apiFetch<ApiTicketDetail>(`/tickets/${id}`);
}

export async function apiListTicketMessages(id: string): Promise<ApiTicketMessage[]> {
  return apiFetch<ApiTicketMessage[]>(`/tickets/${id}/messages`);
}

export async function apiAddTicketMessage(
  id: string,
  body: string,
  isInternal: boolean
): Promise<void> {
  await apiFetch(`/tickets/${id}/messages`, {
    method: 'POST',
    body: { body, is_internal: isInternal },
  });
}

export async function apiSetTicketStatus(id: string, status: TicketStatus): Promise<void> {
  await apiFetch(`/tickets/${id}/status`, {
    method: 'PATCH',
    params: { status },
  });
}
