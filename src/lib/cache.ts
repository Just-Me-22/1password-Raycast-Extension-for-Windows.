import { Cache } from "@raycast/api";
import { OnePasswordItem, OnePasswordVault } from "./types";

const cache = new Cache();

const CACHE_KEYS = {
  ITEMS: "op_items",
  VAULTS: "op_vaults",
  LAST_UPDATE: "op_last_update",
} as const;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Gets cached items if still valid
 */
export function getCachedItems(): OnePasswordItem[] | null {
  const cached = cache.get(CACHE_KEYS.ITEMS);
  const lastUpdate = cache.get(CACHE_KEYS.LAST_UPDATE);

  if (!cached || !lastUpdate) {
    return null;
  }

  const age = Date.now() - parseInt(lastUpdate, 10);
  if (age > CACHE_TTL) {
    return null;
  }

  try {
    return JSON.parse(cached) as OnePasswordItem[];
  } catch {
    return null;
  }
}

/**
 * Caches items with timestamp
 */
export function setCachedItems(items: OnePasswordItem[]): void {
  cache.set(CACHE_KEYS.ITEMS, JSON.stringify(items));
  cache.set(CACHE_KEYS.LAST_UPDATE, Date.now().toString());
}

/**
 * Gets cached vaults if still valid
 */
export function getCachedVaults(): OnePasswordVault[] | null {
  const cached = cache.get(CACHE_KEYS.VAULTS);
  const lastUpdate = cache.get(CACHE_KEYS.LAST_UPDATE);

  if (!cached || !lastUpdate) {
    return null;
  }

  const age = Date.now() - parseInt(lastUpdate, 10);
  if (age > CACHE_TTL) {
    return null;
  }

  try {
    return JSON.parse(cached) as OnePasswordVault[];
  } catch {
    return null;
  }
}

/**
 * Caches vaults with timestamp
 */
export function setCachedVaults(vaults: OnePasswordVault[]): void {
  cache.set(CACHE_KEYS.VAULTS, JSON.stringify(vaults));
  cache.set(CACHE_KEYS.LAST_UPDATE, Date.now().toString());
}

/**
 * Clears all cached data
 */
export function clearCache(): void {
  cache.remove(CACHE_KEYS.ITEMS);
  cache.remove(CACHE_KEYS.VAULTS);
  cache.remove(CACHE_KEYS.LAST_UPDATE);
}

