'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FilterBar } from './FilterBar';
import { EmptyState } from './EmptyState';
import { Modal } from './Modal';
import { createCustomerAction, setCustomerStatusAction } from '@/app/customers/actions';
import { CUSTOMER_STATUSES, CUSTOMER_STATUS_BADGE_CLASS, CUSTOMER_STATUS_LABELS, type Customer, type CustomerStatus } from '@/lib/customers';

export function CustomersPanel({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.fullName, c.preferredName ?? '', c.city ?? '', c.phoneNumber ?? '', c.email ?? '', CUSTOMER_STATUS_LABELS[c.status]]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [customers, query]);

  function handleStatusChange(customer: Customer, status: CustomerStatus) {
    startTransition(async () => {
      const result = await setCustomerStatusAction(customer.id, status);
      if (!result.ok) {
        setBanner({ tone: 'error', message: result.message ?? 'Something went wrong.' });
        return;
      }
      setBanner(null);
      router.refresh();
    });
  }

  if (customers.length === 0) {
    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--hhh-space-md)' }}>
          <button type="button" className="hhh-button-primary" onClick={() => setAdding(true)}>
            Add customer
          </button>
        </div>
        <EmptyState title="No customers yet" message="Customers registered in the app, or added here, appear in this list." />
        {adding && (
          <AddCustomerDialog
            onClose={() => setAdding(false)}
            onCreated={(message) => {
              setAdding(false);
              setBanner({ tone: 'success', message });
              router.refresh();
            }}
            onError={(message) => setBanner({ tone: 'error', message })}
          />
        )}
      </>
    );
  }

  return (
    <div className="hhh-fade-in">
      {banner && (
        <div
          role="status"
          className={banner.tone === 'success' ? 'hhh-badge hhh-badge--positive' : 'hhh-inline-alert'}
          style={{ display: 'block', marginBottom: 'var(--hhh-space-md)' }}
        >
          {banner.message}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--hhh-space-md)', flexWrap: 'wrap', marginBottom: 'var(--hhh-space-sm)' }}>
        <FilterBar value={query} onChange={setQuery} placeholder="Search customers by name, city, contact or status" resultCount={filtered.length} totalCount={customers.length} />
        <button type="button" className="hhh-button-primary" onClick={() => setAdding(true)}>
          Add customer
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No matching customers" message="Try a different name, city, contact or status." />
      ) : (
        <div className="hhh-panel" style={{ overflowX: 'auto' }}>
          <table className="hhh-data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>City</th>
                <th>Contact</th>
                <th>App account</th>
                <th>Registered</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr key={customer.id} onClick={() => router.push(`/customers/${customer.id}`)} style={{ cursor: 'pointer' }} role="link">
                  <td data-label="Name">
                    <a href={`/customers/${customer.id}`} onClick={(e) => e.preventDefault()} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>
                      {customer.preferredName ?? customer.fullName}
                    </a>
                  </td>
                  <td data-label="City">{customer.city ?? '—'}</td>
                  <td data-label="Contact">{customer.phoneNumber ?? customer.email ?? 'Not provided'}</td>
                  <td data-label="App account">
                    <span className={`hhh-badge ${customer.profileId ? 'hhh-badge--positive' : 'hhh-badge--neutral'}`}>
                      {customer.profileId ? 'Linked' : 'Not linked'}
                    </span>
                  </td>
                  <td data-label="Registered">{new Date(customer.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                  <td data-label="Status">
                    <select
                      className="hhh-status-select"
                      aria-label={`Status for ${customer.fullName}`}
                      value={customer.status}
                      disabled={isPending}
                      onChange={(e) => handleStatusChange(customer, e.target.value as CustomerStatus)}
                    >
                      {CUSTOMER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {CUSTOMER_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                    <span className={`hhh-badge ${CUSTOMER_STATUS_BADGE_CLASS[customer.status]}`} style={{ marginLeft: 8 }}>
                      {CUSTOMER_STATUS_LABELS[customer.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <AddCustomerDialog
          onClose={() => setAdding(false)}
          onCreated={(message) => {
            setAdding(false);
            setBanner({ tone: 'success', message });
            router.refresh();
          }}
          onError={(message) => setBanner({ tone: 'error', message })}
        />
      )}
    </div>
  );
}

function AddCustomerDialog({
  onClose,
  onCreated,
  onError,
}: {
  onClose: () => void;
  onCreated: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setFieldError('Full name is required.');
      return;
    }
    setFieldError(null);
    startTransition(async () => {
      const result = await createCustomerAction({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim() || null,
        dateOfBirth: dateOfBirth || null,
      });
      if (!result.ok) {
        const message = result.message ?? 'Something went wrong.';
        setFieldError(message);
        onError(message);
        return;
      }
      onCreated(`${fullName.trim()} was added.`);
    });
  }

  return (
    <Modal title="Add customer" onClose={onClose}>
      <form onSubmit={handleSubmit} className="hhh-form-grid">
        {fieldError && (
          <div role="alert" className="hhh-inline-alert">
            {fieldError}
          </div>
        )}
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--hhh-secondary-text)' }}>
          This creates a bare customer record with no app sign-in linked yet. Linking a customer to their
          own app account is not built in this portal yet.
        </p>
        <div>
          <label className="hhh-field-label" htmlFor="new-customer-name">
            Full name
          </label>
          <input id="new-customer-name" className="hhh-text-field" required value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={isPending} />
        </div>
        <div>
          <label className="hhh-field-label" htmlFor="new-customer-phone">
            Phone number (optional, +countrycode format)
          </label>
          <input id="new-customer-phone" className="hhh-text-field" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} disabled={isPending} placeholder="+919876543210" />
        </div>
        <div>
          <label className="hhh-field-label" htmlFor="new-customer-dob">
            Date of birth (optional)
          </label>
          <input id="new-customer-dob" type="date" className="hhh-text-field" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} disabled={isPending} />
        </div>
        <div style={{ display: 'flex', gap: 'var(--hhh-space-sm)', justifyContent: 'flex-end' }}>
          <button type="button" className="hhh-button-outlined" onClick={onClose} disabled={isPending}>
            Cancel
          </button>
          <button type="submit" className="hhh-button-primary" disabled={isPending}>
            {isPending ? 'Saving…' : 'Add customer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
