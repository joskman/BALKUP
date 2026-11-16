import * as Crypto from 'expo-crypto';

/** Jedinstveni ID (UUID v4) za svaki zapis, potreban za kasniju sinkronizaciju. */
export function newId(): string {
  return Crypto.randomUUID();
}
