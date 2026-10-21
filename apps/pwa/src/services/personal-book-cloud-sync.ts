import { readAuthSession } from './auth.js';
import { synchronizePersonalReadingBooks } from './api-client.js';
import { listPersonalBookArchives, mergePersonalBookArchives } from './personal-book-library.js';
import { runServerMaintenance } from './server-maintenance.js';

export async function syncPersonalBookCloud(force = false): Promise<boolean> {
  const user = readAuthSession()?.user;
  if (!user || !navigator.onLine) return false;
  return runServerMaintenance(async () => {
    const books = await listPersonalBookArchives();
    const changed = await synchronizePersonalReadingBooks(books);
    await mergePersonalBookArchives(changed);
  }, { scope: `:books:${user.id}`, force });
}
