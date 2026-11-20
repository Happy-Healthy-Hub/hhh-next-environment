/**
 * The official Happy Healthy Hub helpline: a fixed, organisation-level
 * support number. Not stored in the database (no `organisation` /
 * `settings` table exists for it yet -- see settings/page.tsx's own
 * "Organisation" notice); a single shared constant so it can be updated
 * centrally later without hunting for every place it is displayed.
 */
export const HHH_HELPLINE_DISPLAY_NUMBER = '+91 7507674555';
export const HHH_HELPLINE_TEL_URI = 'tel:+917507674555';
