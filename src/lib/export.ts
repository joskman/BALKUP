import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';

import { exportAllTables } from '@/db/repo';
import { dayKey } from '@/domain/weeks';

/** Izvozi sve podatke u JSON datoteku i otvara izbornik za dijeljenje/spremanje (kriterij 9). */
export async function exportData(db: SQLiteDatabase): Promise<string> {
  const data = await exportAllTables(db);
  const payload = JSON.stringify({ app: 'BALKUP prototip', version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
  const file = new File(Paths.cache, `balkup-izvoz-${dayKey(Date.now())}-${Date.now()}.json`);
  file.create({ overwrite: true });
  await file.write(payload);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Spremi BALKUP podatke' });
  }
  return file.uri;
}
