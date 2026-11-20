/**
 * Development-only mock-data service. See mock_data_for_web/README.md.
 *
 * Every function here returns the same shape a real repository function
 * would (see types.ts) so that callers can later be pointed at a real
 * implementation without changing. Nothing here touches authentication,
 * RLS, or the real Supabase client -- it only ever reads the static JSON
 * in `mock_data_for_web/`.
 */
import { currentMockScenario } from './config';
import type {
  CareRequestStatus,
  DashboardMetrics,
  MockCareAssignment,
  MockCareRequest,
  MockCareRequestWithDetails,
  MockCustomer,
  MockScenario,
  MockService,
  MockVisit,
  MockWorker,
  StatusCount,
  TimeSeriesPoint,
  UpcomingVisit,
} from './types';

import rawServices from '../../../mock_data_for_web/services.json';
import rawCareRequests from '../../../mock_data_for_web/care_requests.json';
import rawCareAssignments from '../../../mock_data_for_web/care_assignments.json';
import emptyScenario from '../../../mock_data_for_web/scenarios/empty_state.json';
import errorScenario from '../../../mock_data_for_web/scenarios/error_state.json';
import onboardingScenario from '../../../mock_data_for_web/scenarios/onboarding_state.json';
import { listCustomersMutable, listWorkersMutable, listVisitsMutable } from './store';

const STATUS_LABELS: Record<CareRequestStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Being reviewed',
  approved: 'Approved',
  rejected: 'Not approved',
  cancelled: 'Cancelled',
};

interface RawData {
  customers: MockCustomer[];
  workers: MockWorker[];
  services: MockService[];
  careRequests: MockCareRequest[];
  careAssignments: MockCareAssignment[];
  visits: MockVisit[];
}

function loadRaw(scenario: MockScenario): RawData {
  switch (scenario) {
    case 'empty':
      return {
        customers: emptyScenario.customers as MockCustomer[],
        workers: emptyScenario.workers as MockWorker[],
        services: emptyScenario.services as MockService[],
        careRequests: emptyScenario.careRequests as unknown as MockCareRequest[],
        careAssignments: emptyScenario.careAssignments as MockCareAssignment[],
        visits: emptyScenario.visits as MockVisit[],
      };
    case 'onboarding':
      return {
        customers: onboardingScenario.customers as MockCustomer[],
        workers: onboardingScenario.workers as MockWorker[],
        services: rawServices as MockService[],
        careRequests: onboardingScenario.careRequests as unknown as MockCareRequest[],
        careAssignments: onboardingScenario.careAssignments as MockCareAssignment[],
        visits: onboardingScenario.visits as MockVisit[],
      };
    case 'error':
      // Callers go through simulateErrorIfNeeded() before this is ever
      // reached in practice; this branch exists only so loadRaw() is
      // total and never silently returns the full dataset for 'error'.
      throw new Error(errorScenario.message);
    case 'default':
    default:
      // Customers/workers/visits come from the mutable admin store (see
      // store.ts) so CRUD edits are reflected everywhere that reads
      // through loadRaw() -- the dashboard, the list pages, the charts.
      // Services and care requests/assignments have no admin CRUD in
      // this task and stay the static fixture.
      return {
        customers: listCustomersMutable(),
        workers: listWorkersMutable(),
        services: rawServices as MockService[],
        careRequests: rawCareRequests as unknown as MockCareRequest[],
        careAssignments: rawCareAssignments as MockCareAssignment[],
        visits: listVisitsMutable(),
      };
  }
}

function simulateErrorIfNeeded(scenario: MockScenario): void {
  if (scenario === 'error') {
    throw new Error(errorScenario.message);
  }
}

export interface MockDataOptions {
  /** Override the scenario read from `NEXT_PUBLIC_MOCK_SCENARIO` -- used
   * by tests and by any caller that needs a specific scenario regardless
   * of environment configuration. */
  scenario?: MockScenario;
}

function resolveScenario(options?: MockDataOptions): MockScenario {
  return options?.scenario ?? currentMockScenario();
}

export async function listCustomers(options?: MockDataOptions): Promise<MockCustomer[]> {
  const scenario = resolveScenario(options);
  simulateErrorIfNeeded(scenario);
  return loadRaw(scenario).customers;
}

export async function listWorkers(options?: MockDataOptions): Promise<MockWorker[]> {
  const scenario = resolveScenario(options);
  simulateErrorIfNeeded(scenario);
  return loadRaw(scenario).workers;
}

export async function listServices(options?: MockDataOptions): Promise<MockService[]> {
  const scenario = resolveScenario(options);
  simulateErrorIfNeeded(scenario);
  return loadRaw(scenario).services;
}

export async function listCareRequestsWithDetails(
  options?: MockDataOptions
): Promise<MockCareRequestWithDetails[]> {
  const scenario = resolveScenario(options);
  simulateErrorIfNeeded(scenario);
  const { customers, services, careRequests } = loadRaw(scenario);
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const serviceById = new Map(services.map((s) => [s.id, s]));

  return careRequests
    .map((request) => {
      const customer = customerById.get(request.customerId);
      if (!customer) {
        throw new Error(
          `Mock data integrity error: care request ${request.id} references unknown customer ${request.customerId}`
        );
      }
      const serviceNames = request.serviceIds.map((id) => {
        const service = serviceById.get(id);
        if (!service) {
          throw new Error(
            `Mock data integrity error: care request ${request.id} references unknown service ${id}`
          );
        }
        return service.name;
      });
      return {
        ...request,
        customer: {
          id: customer.id,
          fullName: customer.fullName,
          preferredName: customer.preferredName,
        },
        serviceNames,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getDashboardMetrics(options?: MockDataOptions): Promise<DashboardMetrics> {
  const scenario = resolveScenario(options);
  simulateErrorIfNeeded(scenario);
  const { customers, workers, careRequests, visits } = loadRaw(scenario);

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const newCustomersLast30Days = customers.filter(
    (c) => new Date(c.registeredAt).getTime() >= thirtyDaysAgo
  ).length;

  const openCareRequests = careRequests.filter(
    (r) => r.status === 'submitted' || r.status === 'under_review'
  ).length;
  const requestsAwaitingReview = careRequests.filter((r) => r.status === 'submitted').length;
  const approvedCareRequests = careRequests.filter((r) => r.status === 'approved').length;

  const activeWorkers = workers.filter((w) => w.onboardingStatus === 'active').length;

  const scheduledVisits = visits.filter((v) => v.status === 'scheduled').length;
  const completedVisits = visits.filter((v) => v.status === 'completed').length;
  const cancelledOrMissedVisits = visits.filter(
    (v) => v.status === 'cancelled' || v.status === 'missed'
  ).length;

  return {
    totalCustomers: customers.length,
    newCustomersLast30Days,
    activeWorkers,
    openCareRequests,
    requestsAwaitingReview,
    approvedCareRequests,
    scheduledVisits,
    completedVisits,
    cancelledOrMissedVisits,
  };
}

export async function getCareRequestStatusDistribution(
  options?: MockDataOptions
): Promise<StatusCount[]> {
  const scenario = resolveScenario(options);
  simulateErrorIfNeeded(scenario);
  const { careRequests } = loadRaw(scenario);
  const order: CareRequestStatus[] = ['submitted', 'under_review', 'approved', 'rejected', 'cancelled'];
  return order.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    count: careRequests.filter((r) => r.status === status).length,
  }));
}

export async function getServiceDemand(options?: MockDataOptions): Promise<StatusCount[]> {
  const scenario = resolveScenario(options);
  simulateErrorIfNeeded(scenario);
  const { services, careRequests } = loadRaw(scenario);
  return services
    .map((service) => ({
      status: service.id,
      label: service.name,
      count: careRequests.filter((r) => r.serviceIds.includes(service.id)).length,
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
}

/** Monthly request-volume buckets, oldest first -- only months that
 * actually contain at least one request are returned, so the chart
 * never implies data exists for a month with none. */
export async function getCareRequestActivitySeries(
  options?: MockDataOptions
): Promise<TimeSeriesPoint[]> {
  const scenario = resolveScenario(options);
  simulateErrorIfNeeded(scenario);
  const { careRequests } = loadRaw(scenario);

  const byMonth = new Map<string, number>();
  for (const request of careRequests) {
    const d = new Date(request.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }

  const monthFormatter = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' });
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => {
      const [year, month] = key.split('-').map(Number);
      const date = new Date(year, month - 1, 1);
      return { date: `${key}-01`, label: monthFormatter.format(date), count };
    });
}

export async function getUpcomingVisits(options?: MockDataOptions): Promise<UpcomingVisit[]> {
  const scenario = resolveScenario(options);
  simulateErrorIfNeeded(scenario);
  const { careRequests, customers, workers, careAssignments, visits, services } = loadRaw(scenario);

  const assignmentById = new Map(careAssignments.map((a) => [a.id, a]));
  const requestById = new Map(careRequests.map((r) => [r.id, r]));
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const workerById = new Map(workers.map((w) => [w.id, w]));
  const serviceById = new Map(services.map((s) => [s.id, s]));

  const now = Date.now();
  return visits
    .filter((v) => v.status === 'scheduled' && new Date(v.scheduledStart).getTime() >= now)
    .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart))
    .map((visit) => {
      const assignment = assignmentById.get(visit.careAssignmentId);
      if (!assignment) {
        throw new Error(
          `Mock data integrity error: visit ${visit.id} references unknown assignment ${visit.careAssignmentId}`
        );
      }
      const request = requestById.get(assignment.careRequestId);
      if (!request) {
        throw new Error(
          `Mock data integrity error: assignment ${assignment.id} references unknown care request ${assignment.careRequestId}`
        );
      }
      const customer = customerById.get(request.customerId);
      const worker = workerById.get(assignment.workerId);
      return {
        visit,
        customerName: customer?.preferredName ?? customer?.fullName ?? 'Unknown customer',
        workerName: worker?.fullName ?? 'Unknown worker',
        serviceNames: request.serviceIds.map((id) => serviceById.get(id)?.name ?? 'Unknown service'),
      };
    });
}

export { loadRaw as loadRawForTesting };
