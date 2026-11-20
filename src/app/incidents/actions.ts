'use server';

import { revalidatePath } from 'next/cache';
import { apiUpdateIncidentStatus, ApiError, type IncidentStatus } from '@/lib/api';

export interface ActionResult {
  ok: boolean;
  message?: string;
}

function mapApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Your session has expired. Please sign in again.';
    if (err.status === 403) return "You don't have permission to do that.";
    if (err.status === 404) return 'That incident could not be found.';
    return err.detail || 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}

export async function setIncidentStatusAction(
  incidentId: string,
  status: IncidentStatus,
  resolutionNotes: string | null
): Promise<ActionResult> {
  try {
    await apiUpdateIncidentStatus(incidentId, status, resolutionNotes);
  } catch (err) {
    return { ok: false, message: mapApiError(err) };
  }
  revalidatePath('/incidents');
  return { ok: true };
}
