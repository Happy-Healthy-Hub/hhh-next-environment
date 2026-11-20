'use server';

import { revalidatePath } from 'next/cache';
import { apiSetTicketStatus, ApiError, type TicketStatus } from '@/lib/api';

export interface ActionResult {
  ok: boolean;
  message?: string;
}

function mapApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Your session has expired. Please sign in again.';
    if (err.status === 403) return "You don't have permission to do that.";
    if (err.status === 404) return 'That ticket could not be found.';
    return err.detail || 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}

export async function setTicketStatusAction(
  ticketId: string,
  status: TicketStatus
): Promise<ActionResult> {
  try {
    await apiSetTicketStatus(ticketId, status);
  } catch (err) {
    return { ok: false, message: mapApiError(err) };
  }
  revalidatePath('/tickets');
  return { ok: true };
}
