import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  getCareRequestActivitySeries,
  getCareRequestStatusDistribution,
  getDashboardMetrics,
  getServiceDemand,
  getUpcomingVisits,
  listCareRequestsWithDetails,
  listCustomers,
  listServices,
  listWorkers,
  loadRawForTesting,
} from '../service';
import { isMockDataEnabled, currentMockScenario } from '../config';

describe('config', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  test('is disabled by default', () => {
    delete process.env.NEXT_PUBLIC_USE_MOCK_DATA;
    expect(isMockDataEnabled()).toBe(false);
  });

  test('is enabled only when the flag is "true" and NODE_ENV is not production', () => {
    process.env.NEXT_PUBLIC_USE_MOCK_DATA = 'true';
    vi.stubEnv('NODE_ENV', 'test');
    expect(isMockDataEnabled()).toBe(true);
  });

  test('a production NODE_ENV always wins, even with the flag on', () => {
    process.env.NEXT_PUBLIC_USE_MOCK_DATA = 'true';
    vi.stubEnv('NODE_ENV', 'production');
    expect(isMockDataEnabled()).toBe(false);
    vi.unstubAllEnvs();
  });

  test('an unrecognised scenario value falls back to "default"', () => {
    process.env.NEXT_PUBLIC_MOCK_SCENARIO = 'not-a-real-scenario';
    expect(currentMockScenario()).toBe('default');
  });

  test('a recognised scenario value is used as-is', () => {
    process.env.NEXT_PUBLIC_MOCK_SCENARIO = 'empty';
    expect(currentMockScenario()).toBe('empty');
  });
});

describe('referential integrity of the default dataset', () => {
  const { customers, workers, services, careRequests, careAssignments, visits } =
    loadRawForTesting('default');

  test('every care request references a real customer', () => {
    const ids = new Set(customers.map((c) => c.id));
    for (const request of careRequests) {
      expect(ids.has(request.customerId), `request ${request.id} -> customer ${request.customerId}`).toBe(
        true
      );
    }
  });

  test('every care request references real services', () => {
    const ids = new Set(services.map((s) => s.id));
    for (const request of careRequests) {
      for (const serviceId of request.serviceIds) {
        expect(ids.has(serviceId), `request ${request.id} -> service ${serviceId}`).toBe(true);
      }
    }
  });

  test('every assignment references a real request and a real worker', () => {
    const requestIds = new Set(careRequests.map((r) => r.id));
    const workerIds = new Set(workers.map((w) => w.id));
    for (const assignment of careAssignments) {
      expect(requestIds.has(assignment.careRequestId)).toBe(true);
      expect(workerIds.has(assignment.workerId)).toBe(true);
    }
  });

  test('every visit references a real assignment', () => {
    const assignmentIds = new Set(careAssignments.map((a) => a.id));
    for (const visit of visits) {
      expect(assignmentIds.has(visit.careAssignmentId)).toBe(true);
    }
  });

  test('only approved requests have an assignment', () => {
    const approvedIds = new Set(
      careRequests.filter((r) => r.status === 'approved').map((r) => r.id)
    );
    for (const assignment of careAssignments) {
      expect(approvedIds.has(assignment.careRequestId)).toBe(true);
    }
  });
});

describe('list functions', () => {
  test('return the full default dataset', async () => {
    await expect(listCustomers({ scenario: 'default' })).resolves.toHaveLength(14);
    await expect(listWorkers({ scenario: 'default' })).resolves.toHaveLength(8);
    await expect(listServices({ scenario: 'default' })).resolves.toHaveLength(6);
  });

  test('the empty scenario returns no records anywhere', async () => {
    await expect(listCustomers({ scenario: 'empty' })).resolves.toEqual([]);
    await expect(listWorkers({ scenario: 'empty' })).resolves.toEqual([]);
    await expect(listCareRequestsWithDetails({ scenario: 'empty' })).resolves.toEqual([]);
    await expect(getUpcomingVisits({ scenario: 'empty' })).resolves.toEqual([]);
  });

  test('the error scenario rejects instead of returning data', async () => {
    await expect(listCustomers({ scenario: 'error' })).rejects.toThrow(/simulated/i);
    await expect(getDashboardMetrics({ scenario: 'error' })).rejects.toThrow(/simulated/i);
  });

  test('the onboarding scenario surfaces its one incomplete customer and worker', async () => {
    const customers = await listCustomers({ scenario: 'onboarding' });
    const workers = await listWorkers({ scenario: 'onboarding' });
    expect(customers).toHaveLength(1);
    expect(customers[0].accountStatus).toBe('incomplete');
    expect(workers).toHaveLength(1);
    expect(workers[0].onboardingStatus).toBe('pending');
  });

  test('care requests come joined with real customer and service names', async () => {
    const requests = await listCareRequestsWithDetails({ scenario: 'default' });
    expect(requests.length).toBeGreaterThan(0);
    for (const request of requests) {
      expect(request.customer.fullName.length).toBeGreaterThan(0);
      expect(request.serviceNames.length).toBe(request.serviceIds.length);
    }
    // Newest first.
    const createdDates = requests.map((r) => r.createdAt);
    const sorted = [...createdDates].sort().reverse();
    expect(createdDates).toEqual(sorted);
  });
});

describe('getDashboardMetrics', () => {
  test('every figure matches the underlying records -- no hardcoded total can disagree', async () => {
    const [metrics, customers, workers, requests] = await Promise.all([
      getDashboardMetrics({ scenario: 'default' }),
      listCustomers({ scenario: 'default' }),
      listWorkers({ scenario: 'default' }),
      listCareRequestsWithDetails({ scenario: 'default' }),
    ]);

    expect(metrics.totalCustomers).toBe(customers.length);
    expect(metrics.activeWorkers).toBe(workers.filter((w) => w.onboardingStatus === 'active').length);
    expect(metrics.openCareRequests).toBe(
      requests.filter((r) => r.status === 'submitted' || r.status === 'under_review').length
    );
    expect(metrics.requestsAwaitingReview).toBe(
      requests.filter((r) => r.status === 'submitted').length
    );
    expect(metrics.approvedCareRequests).toBe(requests.filter((r) => r.status === 'approved').length);
  });

  test('the empty scenario produces all-zero metrics, not an error', async () => {
    const metrics = await getDashboardMetrics({ scenario: 'empty' });
    expect(metrics).toEqual({
      totalCustomers: 0,
      newCustomersLast30Days: 0,
      activeWorkers: 0,
      openCareRequests: 0,
      requestsAwaitingReview: 0,
      approvedCareRequests: 0,
      scheduledVisits: 0,
      completedVisits: 0,
      cancelledOrMissedVisits: 0,
    });
  });
});

describe('getCareRequestStatusDistribution', () => {
  test('counts sum to the total number of requests', async () => {
    const [distribution, requests] = await Promise.all([
      getCareRequestStatusDistribution({ scenario: 'default' }),
      listCareRequestsWithDetails({ scenario: 'default' }),
    ]);
    const total = distribution.reduce((sum, row) => sum + row.count, 0);
    expect(total).toBe(requests.length);
  });

  test('only the five real statuses appear, never an invented one', async () => {
    const distribution = await getCareRequestStatusDistribution({ scenario: 'default' });
    expect(distribution.map((r) => r.status).sort()).toEqual(
      ['approved', 'cancelled', 'rejected', 'submitted', 'under_review'].sort()
    );
  });
});

describe('getServiceDemand', () => {
  test('omits services nobody has requested, rather than showing a zero bar', async () => {
    const demand = await getServiceDemand({ scenario: 'default' });
    expect(demand.every((row) => row.count > 0)).toBe(true);
  });
});

describe('getCareRequestActivitySeries', () => {
  test('is ordered oldest to newest and only covers months with data', async () => {
    const series = await getCareRequestActivitySeries({ scenario: 'default' });
    const dates = series.map((p) => p.date);
    expect(dates).toEqual([...dates].sort());
    expect(series.every((p) => p.count > 0)).toBe(true);
  });
});

describe('getUpcomingVisits', () => {
  test('only includes scheduled visits in the future, earliest first', async () => {
    const upcoming = await getUpcomingVisits({ scenario: 'default' });
    expect(upcoming.every((u) => u.visit.status === 'scheduled')).toBe(true);
    const starts = upcoming.map((u) => u.visit.scheduledStart);
    expect(starts).toEqual([...starts].sort());
    for (const u of upcoming) {
      expect(u.customerName.length).toBeGreaterThan(0);
      expect(u.workerName.length).toBeGreaterThan(0);
    }
  });
});
