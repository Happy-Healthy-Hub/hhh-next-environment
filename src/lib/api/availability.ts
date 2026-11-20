import { apiFetch } from './client';
import { WEEKDAY_LABELS } from '@/lib/weekday-labels';

export { WEEKDAY_LABELS };

export interface AvailabilitySlot {
  id: string;
  care_associate_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface UnavailabilityRange {
  id: string;
  care_associate_id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  created_at: string;
}

export function apiListAvailabilitySlots(careAssociateId: string) {
  return apiFetch<AvailabilitySlot[]>('/availability/slots', {
    params: { care_associate_id: careAssociateId },
  });
}

export function apiListUnavailability(careAssociateId: string) {
  return apiFetch<UnavailabilityRange[]>('/availability/unavailability', {
    params: { care_associate_id: careAssociateId },
  });
}
