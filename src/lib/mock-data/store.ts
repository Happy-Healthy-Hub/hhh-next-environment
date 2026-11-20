/**
 * Mutable, in-memory, development-only mock store for Customers and
 * Workers CRUD. See mock_data_for_web/README.md.
 *
 * This is deliberately separate from service.ts's read-only `loadRaw()`:
 * the static JSON files are the source of truth for every *read* path
 * that doesn't need to reflect admin edits (dashboard scenario tests,
 * referential-integrity tests, the empty/error/onboarding scenarios).
 * This store exists only so the 'default' scenario's Customers/Workers
 * pages can demonstrate real create/edit/delete/status/bulk behaviour
 * during a single dev-server process, without writing to any real
 * database and without the static fixture files ever being mutated on
 * disk. It resets to the fixture contents on every server restart --
 * this is explicitly NOT a persistence layer, per the master prompt's
 * "temporary development-data layer, not the permanent backend" rule.
 */
import rawCustomers from '../../../mock_data_for_web/customers.json';
import rawWorkers from '../../../mock_data_for_web/workers.json';
import rawVisits from '../../../mock_data_for_web/visits.json';
import type { CustomerAccountStatus, MockCustomer, MockVisit, MockWorker, VisitStatus, WorkerOnboardingStatus } from './types';

interface Store {
  customers: MockCustomer[];
  workers: MockWorker[];
  visits: MockVisit[];
  nextCustomerSeq: number;
  nextWorkerSeq: number;
}

// `globalThis` survives Turbopack/Fast-Refresh module re-evaluation in
// dev (a plain module-level `let` would otherwise reset on every edit),
// so admin edits don't vanish the moment an unrelated file is saved.
const globalForStore = globalThis as unknown as { __hhhMockStore?: Store };

function freshStore(): Store {
  return {
    customers: structuredClone(rawCustomers) as MockCustomer[],
    workers: structuredClone(rawWorkers) as MockWorker[],
    visits: structuredClone(rawVisits) as MockVisit[],
    nextCustomerSeq: rawCustomers.length + 1,
    nextWorkerSeq: rawWorkers.length + 1,
  };
}

function getStore(): Store {
  if (!globalForStore.__hhhMockStore) {
    globalForStore.__hhhMockStore = freshStore();
  }
  return globalForStore.__hhhMockStore;
}

/** Test-only: discards all admin edits and restores the fixture data. */
export function resetMockStoreForTesting(): void {
  globalForStore.__hhhMockStore = freshStore();
}

export class MockNotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} ${id} was not found in the current mock dataset.`);
    this.name = 'MockNotFoundError';
  }
}

export class MockValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MockValidationError';
  }
}

// --- Customers ------------------------------------------------------

export interface CustomerInput {
  fullName: string;
  preferredName?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  city?: string | null;
}

/** No status field in CustomerInput: the default is always derived
 * server-side from whether the profile is actually complete, exactly
 * the real app's own `CustomerProfile.isIncomplete` rule (a phone
 * number and city are the two fields that matter for care delivery).
 * A caller cannot submit an arbitrary starting status. */
function deriveNewCustomerStatus(input: CustomerInput): CustomerAccountStatus {
  return input.phoneNumber && input.city ? 'active' : 'incomplete';
}

function validateCustomerInput(input: CustomerInput): void {
  if (!input.fullName.trim()) throw new MockValidationError('Full name is required.');
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    throw new MockValidationError('Enter a valid email address.');
  }
}

export function listCustomersMutable(): MockCustomer[] {
  return getStore().customers;
}

export function createCustomer(input: CustomerInput): MockCustomer {
  validateCustomerInput(input);
  const store = getStore();
  const customer: MockCustomer = {
    id: `mock-cust-${store.nextCustomerSeq++}`,
    fullName: input.fullName.trim(),
    preferredName: input.preferredName?.trim() || null,
    phoneNumber: input.phoneNumber?.trim() || null,
    email: input.email?.trim() || null,
    city: input.city?.trim() || null,
    accountStatus: deriveNewCustomerStatus(input),
    registeredAt: new Date().toISOString(),
  };
  store.customers.push(customer);
  return customer;
}

export function updateCustomer(id: string, input: CustomerInput): MockCustomer {
  validateCustomerInput(input);
  const store = getStore();
  const existing = store.customers.find((c) => c.id === id);
  if (!existing) throw new MockNotFoundError('Customer', id);
  // Status is never part of the edit form's payload -- it only changes
  // through setCustomerStatus()/bulkSetCustomerStatus(), so an edit can
  // never silently reset it.
  existing.fullName = input.fullName.trim();
  existing.preferredName = input.preferredName?.trim() || null;
  existing.phoneNumber = input.phoneNumber?.trim() || null;
  existing.email = input.email?.trim() || null;
  existing.city = input.city?.trim() || null;
  return existing;
}

const CUSTOMER_STATUSES: CustomerAccountStatus[] = ['active', 'inactive', 'incomplete'];

export function setCustomerStatus(id: string, status: CustomerAccountStatus): MockCustomer {
  if (!CUSTOMER_STATUSES.includes(status)) {
    throw new MockValidationError(`"${status}" is not a valid customer status.`);
  }
  const existing = getStore().customers.find((c) => c.id === id);
  if (!existing) throw new MockNotFoundError('Customer', id);
  existing.accountStatus = status;
  return existing;
}

export function deleteCustomer(id: string): void {
  const store = getStore();
  const index = store.customers.findIndex((c) => c.id === id);
  if (index === -1) throw new MockNotFoundError('Customer', id);
  store.customers.splice(index, 1);
}

// --- Workers ----------------------------------------------------------

export interface WorkerInput {
  fullName: string;
  phoneNumber: string;
  email: string;
}

function validateWorkerInput(input: WorkerInput): void {
  if (!input.fullName.trim()) throw new MockValidationError('Full name is required.');
  if (!input.phoneNumber.trim()) throw new MockValidationError('Phone number is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    throw new MockValidationError('Enter a valid email address.');
  }
}

export function listWorkersMutable(): MockWorker[] {
  return getStore().workers;
}

/** New workers always start `pending` (awaiting onboarding) and
 * `not_started` training / `unavailable` -- the same "Awaiting" default
 * the real worker-lifecycle vocabulary already uses, never invented. */
export function createWorker(input: WorkerInput): MockWorker {
  validateWorkerInput(input);
  const store = getStore();
  const worker: MockWorker = {
    id: `mock-work-${store.nextWorkerSeq++}`,
    fullName: input.fullName.trim(),
    phoneNumber: input.phoneNumber.trim(),
    email: input.email.trim(),
    onboardingStatus: 'pending',
    trainingStatus: 'not_started',
    availability: 'unavailable',
    joinedAt: new Date().toISOString(),
  };
  store.workers.push(worker);
  return worker;
}

export function updateWorker(id: string, input: WorkerInput): MockWorker {
  validateWorkerInput(input);
  const existing = getStore().workers.find((w) => w.id === id);
  if (!existing) throw new MockNotFoundError('Worker', id);
  existing.fullName = input.fullName.trim();
  existing.phoneNumber = input.phoneNumber.trim();
  existing.email = input.email.trim();
  return existing;
}

const WORKER_STATUSES: WorkerOnboardingStatus[] = ['pending', 'active', 'suspended'];

/** `active` additionally sets availability to `available` if the worker
 * was previously `unavailable` (the pending-onboarding default) so an
 * activated worker is immediately schedulable, matching how a real
 * onboarding-approval step would behave. */
export function setWorkerStatus(id: string, status: WorkerOnboardingStatus): MockWorker {
  if (!WORKER_STATUSES.includes(status)) {
    throw new MockValidationError(`"${status}" is not a valid worker status.`);
  }
  const existing = getStore().workers.find((w) => w.id === id);
  if (!existing) throw new MockNotFoundError('Worker', id);
  existing.onboardingStatus = status;
  if (status === 'active' && existing.availability === 'unavailable') {
    existing.availability = 'available';
  }
  if (status === 'suspended') {
    existing.availability = 'unavailable';
  }
  return existing;
}

export function deleteWorker(id: string): void {
  const store = getStore();
  const index = store.workers.findIndex((w) => w.id === id);
  if (index === -1) throw new MockNotFoundError('Worker', id);
  store.workers.splice(index, 1);
}

// --- Visits (status only -- creation/deletion stay out of scope; a
// visit without a real scheduling backend has no legitimate "add" flow
// here, see docs/OPERATIONS_PORTAL.md) --------------------------------

const VISIT_STATUSES: VisitStatus[] = ['scheduled', 'completed', 'missed', 'cancelled'];

export function listVisitsMutable(): MockVisit[] {
  return getStore().visits;
}

export function setVisitStatus(id: string, status: VisitStatus): MockVisit {
  if (!VISIT_STATUSES.includes(status)) {
    throw new MockValidationError(`"${status}" is not a valid visit status.`);
  }
  const existing = getStore().visits.find((v) => v.id === id);
  if (!existing) throw new MockNotFoundError('Visit', id);
  existing.status = status;
  if (status === 'completed' && !existing.checkOutAt) {
    existing.checkOutAt = new Date().toISOString();
  }
  return existing;
}

// --- Bulk helpers: always report per-id outcomes, never a single
// all-or-nothing boolean, so a partial failure is never hidden. ------

export interface BulkResult {
  succeeded: string[];
  failed: { id: string; message: string }[];
}

function runBulk(ids: string[], apply: (id: string) => void): BulkResult {
  const result: BulkResult = { succeeded: [], failed: [] };
  for (const id of ids) {
    try {
      apply(id);
      result.succeeded.push(id);
    } catch (err) {
      result.failed.push({ id, message: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
  return result;
}

export function bulkSetCustomerStatus(ids: string[], status: CustomerAccountStatus): BulkResult {
  return runBulk(ids, (id) => setCustomerStatus(id, status));
}

export function bulkDeleteCustomers(ids: string[]): BulkResult {
  return runBulk(ids, (id) => deleteCustomer(id));
}

export function bulkSetWorkerStatus(ids: string[], status: WorkerOnboardingStatus): BulkResult {
  return runBulk(ids, (id) => setWorkerStatus(id, status));
}

export function bulkDeleteWorkers(ids: string[]): BulkResult {
  return runBulk(ids, (id) => deleteWorker(id));
}
