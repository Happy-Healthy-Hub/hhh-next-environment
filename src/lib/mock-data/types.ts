/**
 * Types for the development-only mock-data layer (`mock_data_for_web/`).
 *
 * These are intentionally separate from `src/lib/care-requests.ts`'s real
 * types where no real equivalent exists yet (customers, workers,
 * assignments, visits have no web-portal data access of their own).
 * `CareRequestStatus` itself is re-exported from the real module, not
 * redefined, since that status model is real and must not drift.
 */
import type { CareRequestStatus } from '@/lib/care-requests';

export type { CareRequestStatus };

export type MockScenario = 'default' | 'empty' | 'error' | 'onboarding';

export interface MockService {
  id: string;
  serviceCode: string;
  name: string;
  description: string;
  basePrice: number;
  currencyCode: string;
  priceUnit: 'per_visit' | 'per_hour' | 'per_day';
  isActive: boolean;
}

export type CustomerAccountStatus = 'active' | 'inactive' | 'incomplete';

export interface MockCustomer {
  id: string;
  fullName: string;
  preferredName: string | null;
  phoneNumber: string | null;
  email: string | null;
  city: string | null;
  accountStatus: CustomerAccountStatus;
  registeredAt: string;
}

export type WorkerOnboardingStatus = 'pending' | 'active' | 'suspended';
export type WorkerTrainingStatus = 'not_started' | 'in_progress' | 'completed';
export type WorkerAvailability = 'available' | 'assigned' | 'on_leave' | 'unavailable';

export interface MockWorker {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  onboardingStatus: WorkerOnboardingStatus;
  trainingStatus: WorkerTrainingStatus;
  availability: WorkerAvailability;
  joinedAt: string;
}

export interface MockCareRequest {
  id: string;
  customerId: string;
  serviceIds: string[];
  status: CareRequestStatus;
  preferredStartDate: string;
  scheduleNotes: string | null;
  decisionReason: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AssignmentStatus = 'offered' | 'accepted' | 'declined' | 'completed' | 'cancelled';

export interface MockCareAssignment {
  id: string;
  careRequestId: string;
  workerId: string;
  status: AssignmentStatus;
  assignedAt: string;
}

export type VisitStatus = 'scheduled' | 'completed' | 'missed' | 'cancelled';

export interface MockVisit {
  id: string;
  careAssignmentId: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: VisitStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
}

/** A care request joined to its customer and service names, for list/
 * table display -- the mock-data equivalent of the real `CareRequest`
 * shape in `care-requests.ts`. */
export interface MockCareRequestWithDetails extends MockCareRequest {
  customer: Pick<MockCustomer, 'id' | 'fullName' | 'preferredName'>;
  serviceNames: string[];
}

export interface DashboardMetrics {
  totalCustomers: number;
  newCustomersLast30Days: number;
  activeWorkers: number;
  openCareRequests: number;
  requestsAwaitingReview: number;
  approvedCareRequests: number;
  scheduledVisits: number;
  completedVisits: number;
  cancelledOrMissedVisits: number;
}

export interface StatusCount {
  status: string;
  label: string;
  count: number;
}

export interface TimeSeriesPoint {
  /** ISO date, start of the bucket (e.g. a month: "2026-09-01"). */
  date: string;
  label: string;
  count: number;
}

export interface UpcomingVisit {
  visit: MockVisit;
  customerName: string;
  workerName: string;
  serviceNames: string[];
}
