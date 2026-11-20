'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState } from './EmptyState';
import { grantRoleAction, revokeRoleAction, setAccountStatusAction } from '@/app/staff/actions';
import { STAFF_ROLE_KEYS, STAFF_ROLE_LABELS, type StaffMember, type StaffRoleKey } from '@/lib/staff';

type PendingAction =
  | { kind: 'grant'; member: StaffMember; role: StaffRoleKey }
  | { kind: 'revoke'; member: StaffMember; role: StaffRoleKey }
  | { kind: 'deactivate'; member: StaffMember }
  | { kind: 'reactivate'; member: StaffMember };

export function StaffTable({ staff }: { staff: StaffMember[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (staff.length === 0) {
    return <EmptyState title="No staff accounts" message="No account holds a Coordinator or Administrator role yet." />;
  }

  function run(action: PendingAction) {
    startTransition(async () => {
      const result =
        action.kind === 'grant'
          ? await grantRoleAction(action.member.profileId, action.role)
          : action.kind === 'revoke'
            ? await revokeRoleAction(action.member.profileId, action.role)
            : await setAccountStatusAction(
                action.member.profileId,
                action.kind === 'deactivate' ? 'deactivated' : 'active'
              );
      setPending(null);
      if (!result.ok) {
        setBanner({ tone: 'error', message: result.message ?? 'Something went wrong.' });
        return;
      }
      setBanner({ tone: 'success', message: 'Updated.' });
      router.refresh();
    });
  }

  return (
    <>
      {banner && (
        <div
          role="status"
          className={banner.tone === 'success' ? 'hhh-badge hhh-badge--positive' : 'hhh-inline-alert'}
          style={{ display: 'block', marginBottom: 'var(--hhh-space-md)' }}
        >
          {banner.message}
        </div>
      )}
      <div className="hhh-panel" style={{ overflowX: 'auto' }}>
        <table className="hhh-data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Roles</th>
              <th>Access</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => {
              const availableToGrant = STAFF_ROLE_KEYS.filter((r) => !member.roles.includes(r));
              return (
                <tr key={member.profileId}>
                  <td data-label="Name">{member.displayName ?? 'Name not set'}</td>
                  <td data-label="Email" style={{ color: member.email ? undefined : 'var(--hhh-secondary-text)' }}>{member.email ?? '—'}</td>
                  <td data-label="Roles">
                    {member.roles.map((role) => (
                      <span key={role} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 8 }}>
                        <span className="hhh-badge hhh-badge--neutral">{STAFF_ROLE_LABELS[role]}</span>
                        <button
                          type="button"
                          className="hhh-button-small hhh-button-small--danger"
                          disabled={member.isSelf}
                          title={member.isSelf ? "You can't change your own role or access." : undefined}
                          onClick={() => setPending({ kind: 'revoke', member, role })}
                        >
                          Remove
                        </button>
                      </span>
                    ))}
                  </td>
                  <td data-label="Access">
                    <span className={`hhh-badge ${member.accountStatus === 'active' ? 'hhh-badge--positive' : 'hhh-badge--neutral'}`}>
                      {member.accountStatus === 'active' ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td data-label="Actions">
                    <div className="hhh-row-actions" style={{ flexWrap: 'wrap' }}>
                      {availableToGrant.length > 0 && (
                        <select
                          className="hhh-status-select"
                          aria-label={`Grant a role to ${member.displayName ?? 'this account'}`}
                          disabled={member.isSelf}
                          defaultValue=""
                          onChange={(e) => {
                            const role = e.target.value as StaffRoleKey;
                            e.target.value = '';
                            if (role) setPending({ kind: 'grant', member, role });
                          }}
                        >
                          <option value="" disabled>
                            Grant role…
                          </option>
                          {availableToGrant.map((role) => (
                            <option key={role} value={role}>
                              {STAFF_ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        className="hhh-button-small"
                        disabled={member.isSelf}
                        title={member.isSelf ? "You can't change your own role or access." : undefined}
                        onClick={() =>
                          setPending(
                            member.accountStatus === 'active'
                              ? { kind: 'deactivate', member }
                              : { kind: 'reactivate', member }
                          )
                        }
                      >
                        {member.accountStatus === 'active' ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.85rem' }}>
        You cannot change your own role or access -- this is enforced by the database, not only by this
        screen.
      </p>

      {pending && (
        <ConfirmDialog
          title={
            pending.kind === 'grant'
              ? `Grant "${STAFF_ROLE_KEYS_LABEL(pending.role)}" to ${pending.member.displayName ?? 'this account'}?`
              : pending.kind === 'revoke'
                ? `Remove "${STAFF_ROLE_KEYS_LABEL(pending.role)}" from ${pending.member.displayName ?? 'this account'}?`
                : pending.kind === 'deactivate'
                  ? `Deactivate ${pending.member.displayName ?? 'this account'}'s access?`
                  : `Reactivate ${pending.member.displayName ?? 'this account'}'s access?`
          }
          message="This is recorded in the audit log and takes effect immediately."
          confirmLabel={pending.kind === 'deactivate' || pending.kind === 'revoke' ? 'Confirm' : 'Confirm'}
          destructive={pending.kind === 'revoke' || pending.kind === 'deactivate'}
          isPending={isPending}
          onConfirm={() => run(pending)}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}

function STAFF_ROLE_KEYS_LABEL(role: StaffRoleKey): string {
  return STAFF_ROLE_LABELS[role];
}
