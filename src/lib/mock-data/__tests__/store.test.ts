import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  MockNotFoundError,
  MockValidationError,
  bulkDeleteCustomers,
  bulkDeleteWorkers,
  bulkSetCustomerStatus,
  bulkSetWorkerStatus,
  createCustomer,
  createWorker,
  deleteCustomer,
  deleteWorker,
  listCustomersMutable,
  listWorkersMutable,
  resetMockStoreForTesting,
  setCustomerStatus,
  setVisitStatus,
  setWorkerStatus,
  updateCustomer,
  updateWorker,
} from '../store';

beforeEach(() => {
  resetMockStoreForTesting();
});
afterEach(() => {
  resetMockStoreForTesting();
});

describe('customers', () => {
  test('creating with a phone number and city defaults to active', () => {
    const c = createCustomer({ fullName: 'Test Person', phoneNumber: '+91 1', city: 'Pune' });
    expect(c.accountStatus).toBe('active');
  });

  test('creating without a phone number or city defaults to incomplete', () => {
    const c = createCustomer({ fullName: 'Test Person' });
    expect(c.accountStatus).toBe('incomplete');
  });

  test('a new customer gets a unique id and is visible in the list', () => {
    const before = listCustomersMutable().length;
    const c = createCustomer({ fullName: 'New Customer' });
    const after = listCustomersMutable();
    expect(after.length).toBe(before + 1);
    expect(after.find((x) => x.id === c.id)).toBeDefined();
  });

  test('blank full name is rejected', () => {
    expect(() => createCustomer({ fullName: '   ' })).toThrow(MockValidationError);
  });

  test('invalid email is rejected', () => {
    expect(() => createCustomer({ fullName: 'X', email: 'not-an-email' })).toThrow(MockValidationError);
  });

  test('editing preserves status -- it is never part of the edit payload', () => {
    const c = createCustomer({ fullName: 'X', phoneNumber: '1', city: 'Pune' });
    expect(c.accountStatus).toBe('active');
    const updated = updateCustomer(c.id, { fullName: 'X Updated' });
    expect(updated.fullName).toBe('X Updated');
    expect(updated.accountStatus).toBe('active');
  });

  test('editing an unknown id throws MockNotFoundError', () => {
    expect(() => updateCustomer('does-not-exist', { fullName: 'X' })).toThrow(MockNotFoundError);
  });

  test('status change through an allowed value works', () => {
    const c = createCustomer({ fullName: 'X' });
    const updated = setCustomerStatus(c.id, 'inactive');
    expect(updated.accountStatus).toBe('inactive');
  });

  test('an invalid status string is rejected, not silently accepted', () => {
    const c = createCustomer({ fullName: 'X' });
    // @ts-expect-error -- deliberately testing a bad value past the type
    expect(() => setCustomerStatus(c.id, 'deleted-forever')).toThrow(MockValidationError);
  });

  test('deleting removes the record', () => {
    const c = createCustomer({ fullName: 'X' });
    deleteCustomer(c.id);
    expect(listCustomersMutable().find((x) => x.id === c.id)).toBeUndefined();
  });

  test('bulk status update reports partial failure instead of throwing', () => {
    const a = createCustomer({ fullName: 'A' });
    const result = bulkSetCustomerStatus([a.id, 'does-not-exist'], 'active');
    expect(result.succeeded).toEqual([a.id]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].id).toBe('does-not-exist');
  });

  test('bulk delete reports partial failure and only removes the real ids', () => {
    const a = createCustomer({ fullName: 'A' });
    const b = createCustomer({ fullName: 'B' });
    const result = bulkDeleteCustomers([a.id, 'does-not-exist', b.id]);
    expect(result.succeeded.sort()).toEqual([a.id, b.id].sort());
    expect(result.failed).toHaveLength(1);
    expect(listCustomersMutable().find((x) => x.id === a.id)).toBeUndefined();
    expect(listCustomersMutable().find((x) => x.id === b.id)).toBeUndefined();
  });
});

describe('workers', () => {
  test('a new worker always defaults to pending onboarding, not_started training, unavailable', () => {
    const w = createWorker({ fullName: 'New Worker', phoneNumber: '1', email: 'w@example.com' });
    expect(w.onboardingStatus).toBe('pending');
    expect(w.trainingStatus).toBe('not_started');
    expect(w.availability).toBe('unavailable');
  });

  test('missing required fields are rejected', () => {
    expect(() => createWorker({ fullName: '', phoneNumber: '1', email: 'w@example.com' })).toThrow(
      MockValidationError
    );
    expect(() => createWorker({ fullName: 'X', phoneNumber: '', email: 'w@example.com' })).toThrow(
      MockValidationError
    );
    expect(() => createWorker({ fullName: 'X', phoneNumber: '1', email: 'not-an-email' })).toThrow(
      MockValidationError
    );
  });

  test('activating a pending worker also makes them available', () => {
    const w = createWorker({ fullName: 'X', phoneNumber: '1', email: 'w@example.com' });
    const updated = setWorkerStatus(w.id, 'active');
    expect(updated.onboardingStatus).toBe('active');
    expect(updated.availability).toBe('available');
  });

  test('suspending a worker makes them unavailable', () => {
    const w = createWorker({ fullName: 'X', phoneNumber: '1', email: 'w@example.com' });
    setWorkerStatus(w.id, 'active');
    const updated = setWorkerStatus(w.id, 'suspended');
    expect(updated.onboardingStatus).toBe('suspended');
    expect(updated.availability).toBe('unavailable');
  });

  test('editing preserves onboarding status', () => {
    const w = createWorker({ fullName: 'X', phoneNumber: '1', email: 'w@example.com' });
    setWorkerStatus(w.id, 'active');
    const updated = updateWorker(w.id, { fullName: 'X2', phoneNumber: '2', email: 'w2@example.com' });
    expect(updated.onboardingStatus).toBe('active');
  });

  test('deleting an unknown id throws MockNotFoundError', () => {
    expect(() => deleteWorker('does-not-exist')).toThrow(MockNotFoundError);
  });

  test('bulk status update on workers reports partial failure', () => {
    const a = createWorker({ fullName: 'A', phoneNumber: '1', email: 'a@example.com' });
    const result = bulkSetWorkerStatus([a.id, 'does-not-exist'], 'active');
    expect(result.succeeded).toEqual([a.id]);
    expect(result.failed).toHaveLength(1);
  });

  test('bulk delete on workers only removes the real ids', () => {
    const a = createWorker({ fullName: 'A', phoneNumber: '1', email: 'a@example.com' });
    const result = bulkDeleteWorkers([a.id, 'does-not-exist']);
    expect(result.succeeded).toEqual([a.id]);
    expect(result.failed).toHaveLength(1);
    expect(listWorkersMutable().find((x) => x.id === a.id)).toBeUndefined();
  });
});

describe('visits', () => {
  test('an invalid status is rejected', () => {
    // @ts-expect-error -- deliberately testing a bad value past the type
    expect(() => setVisitStatus('whatever-id', 'bogus')).toThrow(MockValidationError);
  });

  test('an unknown visit id is reported, not silently ignored', () => {
    expect(() => setVisitStatus('does-not-exist', 'completed')).toThrow(MockNotFoundError);
  });
});
