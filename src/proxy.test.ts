import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

describe('admin route proxy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('keeps the real login page reachable without backend configuration', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

    const response = await proxy(new NextRequest('https://hhh.foundation/admin/login'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('fails closed for protected admin routes without backend configuration', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

    const response = await proxy(new NextRequest('https://hhh.foundation/admin/requests'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://hhh.foundation/admin/login');
  });
});
