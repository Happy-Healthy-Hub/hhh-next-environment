/**
 * Local Demo Mode activation. See demo/README.md for the full
 * explanation of what this is and why it exists.
 *
 * `NEXT_PUBLIC_DEMO_MODE` is a `NEXT_PUBLIC_*` variable, so it is
 * readable in the browser by definition -- that makes it a development
 * convenience flag, never a security boundary. The actual boundary is
 * this function re-checking `NODE_ENV` on every call, including on the
 * server for every request: a production build (`NODE_ENV=production`,
 * which `next build`/`next start` set automatically) can never serve
 * demo data or demo authentication even if the flag is left on in an
 * environment file. This mirrors the existing
 * `mock-data/config.ts#isMockDataEnabled` pattern exactly -- that
 * pattern is proven in this codebase, so Demo Mode reuses it rather
 * than inventing a different safety check.
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production';
}
