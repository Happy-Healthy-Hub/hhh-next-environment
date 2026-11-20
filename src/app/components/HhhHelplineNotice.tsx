import { HHH_HELPLINE_DISPLAY_NUMBER, HHH_HELPLINE_TEL_URI } from '@/lib/hhhHelpline';

/**
 * "HHH - support and helpline": the official, organisation-level support
 * number, shown read-only to staff. Distinct from any per-customer
 * emergency contact and labelled "Official Helpline", never an
 * emergency/ambulance service.
 */
export function HhhHelplineNotice() {
  return (
    <div className="hhh-card">
      <div style={{ fontWeight: 600, marginBottom: 'var(--hhh-space-xs)' }}>
        HHH - support and helpline
      </div>
      <div style={{ color: 'var(--hhh-secondary-text)', marginBottom: 'var(--hhh-space-xs)' }}>
        Happy Healthy Hub — Official Helpline
      </div>
      <a
        href={HHH_HELPLINE_TEL_URI}
        style={{
          color: 'var(--hhh-dark-teal)',
          fontWeight: 700,
          fontSize: '1.1rem',
          textDecoration: 'none',
        }}
      >
        {HHH_HELPLINE_DISPLAY_NUMBER}
      </a>
    </div>
  );
}
