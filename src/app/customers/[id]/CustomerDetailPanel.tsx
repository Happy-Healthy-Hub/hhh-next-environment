'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { setCustomerStatusAction } from '../actions';
import {
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_LABELS,
  type CustomerDetail,
  type CustomerStatus,
  type CustomerVital,
} from '@/lib/customers';

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--hhh-space-md)', padding: '8px 0', borderBottom: '1px solid var(--hhh-border)' }}>
      <span style={{ minWidth: 140, color: 'var(--hhh-secondary-text)', fontWeight: 600, fontSize: '0.85rem' }}>{label}</span>
      <span style={{ flex: 1 }}>{value || '—'}</span>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium' });
}

function formatAddress(c: CustomerDetail): string | null {
  const parts = [c.addressLine1, c.addressLine2, c.city, c.stateRegion, c.postalCode].filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(', ');
}

const REQUEST_STATUS_BADGE: Record<string, string> = {
  submitted: 'hhh-badge--attention',
  under_review: 'hhh-badge--attention',
  approved: 'hhh-badge--positive',
  rejected: 'hhh-badge--critical',
  cancelled: 'hhh-badge--neutral',
};

const ASSIGNMENT_STATUS_BADGE: Record<string, string> = {
  pending: 'hhh-badge--attention',
  accepted: 'hhh-badge--positive',
  active: 'hhh-badge--positive',
  in_progress: 'hhh-badge--positive',
  completed: 'hhh-badge--positive',
  declined: 'hhh-badge--critical',
  cancelled: 'hhh-badge--neutral',
  ended: 'hhh-badge--neutral',
};

function formatVital(v: CustomerVital): string {
  const parts: string[] = [];
  if (v.systolicBp != null && v.diastolicBp != null) parts.push(`BP: ${v.systolicBp}/${v.diastolicBp}`);
  if (v.spo2Percent != null) parts.push(`SpO2: ${v.spo2Percent}%`);
  if (v.pulseBpm != null) parts.push(`Pulse: ${v.pulseBpm} bpm`);
  if (v.temperatureF != null) parts.push(`Temp: ${v.temperatureF}°F`);
  return parts.join(' · ') || 'No readings';
}

export function CustomerDetailPanel({ customer }: { customer: CustomerDetail }) {
  const router = useRouter();
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'overview' | 'care' | 'contacts'>('overview');

  function handleStatusChange(status: CustomerStatus) {
    startTransition(async () => {
      const result = await setCustomerStatusAction(customer.id, status);
      if (!result.ok) {
        setBanner({ tone: 'error', message: result.message ?? 'Something went wrong.' });
        return;
      }
      setBanner({ tone: 'success', message: `Status changed to ${CUSTOMER_STATUS_LABELS[status]}.` });
      router.refresh();
    });
  }

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'care' as const, label: 'Care history' },
    { key: 'contacts' as const, label: 'Contacts & family' },
  ];

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

      <div style={{ display: 'flex', gap: 'var(--hhh-space-xs)', marginBottom: 'var(--hhh-space-lg)', borderBottom: '2px solid var(--hhh-border)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: 'none',
              border: 'none',
              padding: '10px 16px',
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? 'var(--hhh-dark-teal)' : 'var(--hhh-secondary-text)',
              borderBottom: activeTab === tab.key ? '2px solid var(--hhh-dark-teal)' : '2px solid transparent',
              marginBottom: '-2px',
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gap: 'var(--hhh-space-lg)', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          <div className="hhh-card">
            <h3 style={{ margin: '0 0 var(--hhh-space-md)' }}>Personal information</h3>
            <InfoRow label="Full name" value={customer.fullName} />
            <InfoRow label="Preferred name" value={customer.preferredName} />
            <InfoRow label="Date of birth" value={customer.dateOfBirth ? formatDate(customer.dateOfBirth) : null} />
            <InfoRow label="Phone" value={customer.phoneNumber} />
            <InfoRow label="Email" value={customer.email} />
            <InfoRow label="Address" value={formatAddress(customer)} />
            <InfoRow label="Language" value={customer.preferredLanguage} />
            <InfoRow label="Registered" value={formatDate(customer.createdAt)} />
            <InfoRow label="App account" value={customer.profileId ? 'Linked' : 'Not linked'} />
          </div>

          <div className="hhh-card">
            <h3 style={{ margin: '0 0 var(--hhh-space-md)' }}>Actions</h3>
            <div style={{ marginBottom: 'var(--hhh-space-md)' }}>
              <label className="hhh-field-label" htmlFor="customer-status">Change status</label>
              <select
                id="customer-status"
                className="hhh-status-select"
                value={customer.status}
                disabled={isPending}
                onChange={(e) => handleStatusChange(e.target.value as CustomerStatus)}
              >
                {CUSTOMER_STATUSES.map((s) => (
                  <option key={s} value={s}>{CUSTOMER_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gap: 'var(--hhh-space-sm)', marginTop: 'var(--hhh-space-md)' }}>
              <div style={{ padding: 'var(--hhh-space-md)', background: 'var(--hhh-neutral-surface)', borderRadius: 8 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--hhh-secondary-text)', fontWeight: 600 }}>Emergency contacts</div>
                <div style={{ fontWeight: 700 }}>{customer.emergencyContacts.length}</div>
              </div>
              <div style={{ padding: 'var(--hhh-space-md)', background: 'var(--hhh-neutral-surface)', borderRadius: 8 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--hhh-secondary-text)', fontWeight: 600 }}>Care requests</div>
                <div style={{ fontWeight: 700 }}>{customer.careRequests.length}</div>
              </div>
              <div style={{ padding: 'var(--hhh-space-md)', background: 'var(--hhh-neutral-surface)', borderRadius: 8 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--hhh-secondary-text)', fontWeight: 600 }}>Assignments</div>
                <div style={{ fontWeight: 700 }}>{customer.assignments.length}</div>
              </div>
              <div style={{ padding: 'var(--hhh-space-md)', background: 'var(--hhh-neutral-surface)', borderRadius: 8 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--hhh-secondary-text)', fontWeight: 600 }}>Vitals recorded</div>
                <div style={{ fontWeight: 700 }}>{customer.vitals.length}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'care' && (
        <div style={{ display: 'grid', gap: 'var(--hhh-space-lg)' }}>
          <div className="hhh-card">
            <h3 style={{ margin: '0 0 var(--hhh-space-md)' }}>
              Care requests
              {customer.careRequests.length > 0 && (
                <span style={{ fontWeight: 400, color: 'var(--hhh-secondary-text)', fontSize: '0.85rem', marginLeft: 8 }}>
                  ({customer.careRequests.length})
                </span>
              )}
            </h3>
            {customer.careRequests.length === 0 ? (
              <p style={{ color: 'var(--hhh-secondary-text)', margin: 0 }}>No care requests found.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="hhh-data-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Submitted</th>
                      <th>Preferred start</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.careRequests.map((cr) => (
                      <tr key={cr.id}>
                        <td data-label="Status">
                          <span className={`hhh-badge ${REQUEST_STATUS_BADGE[cr.status] ?? 'hhh-badge--neutral'}`}>
                            {cr.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td data-label="Submitted">{formatDate(cr.createdAt)}</td>
                        <td data-label="Preferred start">{cr.preferredStartDate ?? '—'}</td>
                        <td>
                          <Link href={`/requests/${cr.id}`} className="hhh-button-small">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="hhh-card">
            <h3 style={{ margin: '0 0 var(--hhh-space-md)' }}>
              Care assignments
              {customer.assignments.length > 0 && (
                <span style={{ fontWeight: 400, color: 'var(--hhh-secondary-text)', fontSize: '0.85rem', marginLeft: 8 }}>
                  ({customer.assignments.length})
                </span>
              )}
            </h3>
            {customer.assignments.length === 0 ? (
              <p style={{ color: 'var(--hhh-secondary-text)', margin: 0 }}>No assignments found.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="hhh-data-table">
                  <thead>
                    <tr>
                      <th>Caregiver</th>
                      <th>Status</th>
                      <th>Assigned</th>
                      <th>Ended</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.assignments.map((a) => (
                      <tr key={a.id}>
                        <td data-label="Caregiver">{a.caregiverName}</td>
                        <td data-label="Status">
                          <span className={`hhh-badge ${ASSIGNMENT_STATUS_BADGE[a.status] ?? 'hhh-badge--neutral'}`}>
                            {a.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td data-label="Assigned">{a.assignedAt ? formatDate(a.assignedAt) : '—'}</td>
                        <td data-label="Ended">{a.endedAt ? formatDate(a.endedAt) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="hhh-card">
            <h3 style={{ margin: '0 0 var(--hhh-space-md)' }}>
              Provider assignments
              {customer.providerAssignments.length > 0 && (
                <span style={{ fontWeight: 400, color: 'var(--hhh-secondary-text)', fontSize: '0.85rem', marginLeft: 8 }}>
                  ({customer.providerAssignments.length})
                </span>
              )}
            </h3>
            {customer.providerAssignments.length === 0 ? (
              <p style={{ color: 'var(--hhh-secondary-text)', margin: 0 }}>No provider assignments found.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="hhh-data-table">
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th>Status</th>
                      <th>Assigned</th>
                      <th>Ended</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.providerAssignments.map((pa) => (
                      <tr key={pa.id}>
                        <td data-label="Provider">{pa.providerOrgName}</td>
                        <td data-label="Status">
                          <span className={`hhh-badge ${ASSIGNMENT_STATUS_BADGE[pa.status] ?? 'hhh-badge--neutral'}`}>
                            {pa.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td data-label="Assigned">{formatDate(pa.assignedAt)}</td>
                        <td data-label="Ended">{pa.endedAt ? formatDate(pa.endedAt) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="hhh-card">
            <h3 style={{ margin: '0 0 var(--hhh-space-md)' }}>
              Vitals history
              {customer.vitals.length > 0 && (
                <span style={{ fontWeight: 400, color: 'var(--hhh-secondary-text)', fontSize: '0.85rem', marginLeft: 8 }}>
                  ({customer.vitals.length})
                </span>
              )}
            </h3>
            {customer.vitals.length === 0 ? (
              <p style={{ color: 'var(--hhh-secondary-text)', margin: 0 }}>No vitals recorded yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="hhh-data-table">
                  <thead>
                    <tr>
                      <th>Recorded</th>
                      <th>By</th>
                      <th>Readings</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.vitals.map((v) => (
                      <tr key={v.id}>
                        <td data-label="Recorded">{new Date(v.recordedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                        <td data-label="By">
                          <span className="hhh-badge hhh-badge--neutral">{v.recorderRole}</span>
                        </td>
                        <td data-label="Readings">{formatVital(v)}</td>
                        <td data-label="Notes">{v.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div style={{ display: 'grid', gap: 'var(--hhh-space-lg)' }}>
          <div className="hhh-card">
            <h3 style={{ margin: '0 0 var(--hhh-space-md)' }}>
              Emergency contacts
              {customer.emergencyContacts.length > 0 && (
                <span style={{ fontWeight: 400, color: 'var(--hhh-secondary-text)', fontSize: '0.85rem', marginLeft: 8 }}>
                  ({customer.emergencyContacts.length})
                </span>
              )}
            </h3>
            {customer.emergencyContacts.length === 0 ? (
              <p style={{ color: 'var(--hhh-secondary-text)', margin: 0 }}>No emergency contacts on file.</p>
            ) : (
              <div style={{ display: 'grid', gap: 'var(--hhh-space-sm)' }}>
                {customer.emergencyContacts.map((ec) => (
                  <div key={ec.id} style={{ padding: 'var(--hhh-space-md)', background: 'var(--hhh-neutral-surface)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 600 }}>{ec.fullName}</div>
                      {ec.priority != null && (
                        <span className="hhh-badge hhh-badge--neutral" style={{ fontSize: '0.75rem' }}>
                          Priority {ec.priority}
                        </span>
                      )}
                    </div>
                    {ec.relationship && (
                      <div style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.85rem' }}>{ec.relationship}</div>
                    )}
                    <div style={{ fontSize: '0.9rem', marginTop: 4 }}>
                      {ec.phoneNumber}
                      {ec.alternatePhone && <span style={{ color: 'var(--hhh-secondary-text)' }}> · {ec.alternatePhone}</span>}
                    </div>
                    {ec.email && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--hhh-secondary-text)' }}>{ec.email}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="hhh-card">
            <h3 style={{ margin: '0 0 var(--hhh-space-md)' }}>
              Family relationships
              {customer.familyRelationships.length > 0 && (
                <span style={{ fontWeight: 400, color: 'var(--hhh-secondary-text)', fontSize: '0.85rem', marginLeft: 8 }}>
                  ({customer.familyRelationships.length})
                </span>
              )}
            </h3>
            {customer.familyRelationships.length === 0 ? (
              <p style={{ color: 'var(--hhh-secondary-text)', margin: 0 }}>No family relationships linked.</p>
            ) : (
              <div style={{ display: 'grid', gap: 'var(--hhh-space-sm)' }}>
                {customer.familyRelationships.map((fr) => (
                  <div key={fr.id} style={{ padding: 'var(--hhh-space-md)', background: 'var(--hhh-neutral-surface)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 600 }}>{fr.familyProfileName ?? 'Unknown'}</div>
                      <span className={`hhh-badge ${fr.status === 'active' ? 'hhh-badge--positive' : 'hhh-badge--neutral'}`} style={{ fontSize: '0.75rem' }}>
                        {fr.status}
                      </span>
                    </div>
                    <div style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.85rem' }}>{fr.relationshipLabel}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
