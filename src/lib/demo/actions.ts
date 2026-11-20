'use server';

import { revalidatePath } from 'next/cache';
import { isDemoMode } from './config';
import { resetDemoStore } from './store';

/** Restores every demo entity to `demo/demo-data.json`'s committed
 * contents. Refuses outright unless `isDemoMode()` is true. */
export async function resetDemoDataAction(): Promise<void> {
  if (!isDemoMode()) {
    throw new Error('Local Demo Mode is not enabled.');
  }
  resetDemoStore();
  revalidatePath('/', 'layout');
}
