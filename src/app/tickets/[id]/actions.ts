'use server';

import { revalidatePath } from 'next/cache';
import { apiAddTicketMessage, apiSetTicketStatus, type TicketStatus } from '@/lib/api/tickets';
import { ApiError } from '@/lib/api/client';

export interface ActionResult {
  ok: boolean;
  message?: string;
}

function mapApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Your session has expired. Please sign in again.';
    if (err.status === 403) return "You don't have permission to do that.";
    if (err.status === 404) return 'That ticket could not be found.';
    if (err.status === 422) return err.detail || 'That value is not valid.';
    return err.detail || 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}

export async function addTicketMessageAction(
  ticketId: string,
  body: string,
  isInternal: boolean
): Promise<ActionResult> {
  try {
    await apiAddTicketMessage(ticketId, body, isInternal);
  } catch (err) {
    return { ok: false, message: mapApiError(err) };
  }
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath('/tickets');
  return { ok: true };
}

export async function setTicketStatusForDetailAction(
  ticketId: string,
  status: TicketStatus
): Promise<ActionResult> {
  try {
    await apiSetTicketStatus(ticketId, status);
  } catch (err) {
    return { ok: false, message: mapApiError(err) };
  }
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath('/tickets');
  return { ok: true };
}
