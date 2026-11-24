export const PRODUCTION_API_BASE_URL = 'https://api.hhh.foundation';

// Server-only override for local development and CI. Normalizing the
// trailing slash prevents requests from accidentally containing `//api/v1`.
export const API_BASE_URL = (process.env.HHH_API_URL ?? PRODUCTION_API_BASE_URL).replace(/\/+$/, '');
