/**
 * Mock-data activation. See mock_data_for_web/README.md "Activating mock
 * mode" for the full explanation.
 *
 * `NEXT_PUBLIC_USE_MOCK_DATA` is a `NEXT_PUBLIC_*` variable, so it is
 * readable in the browser by definition -- that makes it a development
 * convenience flag, never a security boundary. The boundary is this
 * function itself re-checking `NODE_ENV` on every call, including on the
 * server for every request: a production build (`NODE_ENV=production`,
 * which `next build`/`next start` set automatically) can never serve
 * mock data even if the flag is left on in an environment file.
 */
import type { MockScenario } from './types';

export function isMockDataEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' && process.env.NODE_ENV !== 'production';
}

const KNOWN_SCENARIOS: readonly MockScenario[] = ['default', 'empty', 'error', 'onboarding'];

export function currentMockScenario(): MockScenario {
  const value = process.env.NEXT_PUBLIC_MOCK_SCENARIO;
  return (KNOWN_SCENARIOS as readonly string[]).includes(value ?? '')
    ? (value as MockScenario)
    : 'default';
}
