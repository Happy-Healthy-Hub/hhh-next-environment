import { describe, expect, it } from 'vitest';
import { API_BASE_URL, PRODUCTION_API_BASE_URL } from './config';

describe('API configuration', () => {
  it('uses the official production host by default', () => {
    expect(PRODUCTION_API_BASE_URL).toBe('https://api.hhh.foundation');
    expect(API_BASE_URL).toBe('https://api.hhh.foundation');
  });
});
