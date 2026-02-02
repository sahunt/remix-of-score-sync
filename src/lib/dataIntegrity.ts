/**
 * Development-mode data integrity assertions.
 * These log errors when counts don't add up, helping catch bugs early.
 * 
 * All assertions are no-ops in production builds.
 */

/**
 * Asserts that catalog count equals played + unplayed counts.
 * Logs an error to console if the invariant is violated.
 */
export function assertCountIntegrity(
  context: string,
  catalogCount: number,
  playedCount: number,
  unplayedCount: number
): void {
  if (import.meta.env.PROD) return;
  
  const expected = catalogCount;
  const actual = playedCount + unplayedCount;
  
  if (expected !== actual) {
    console.error(
      `[DATA INTEGRITY] ${context}: Count mismatch!`,
      `\n  Catalog: ${catalogCount}`,
      `\n  Played: ${playedCount}`,
      `\n  Unplayed: ${unplayedCount}`,
      `\n  Expected: ${expected}, Actual: ${actual}`,
      `\n  Difference: ${Math.abs(expected - actual)}`
    );
  }
}

/**
 * Asserts that a collection has no duplicate keys.
 * Logs an error to console if duplicates are found.
 */
export function assertNoDuplicates<T>(
  context: string,
  items: T[],
  keyFn: (item: T) => string | number
): void {
  if (import.meta.env.PROD) return;
  
  const seen = new Set<string | number>();
  const duplicates: (string | number)[] = [];
  
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) {
      duplicates.push(key);
    }
    seen.add(key);
  }
  
  if (duplicates.length > 0) {
    console.error(
      `[DATA INTEGRITY] ${context}: Found ${duplicates.length} duplicates!`,
      `\n  First 5:`, duplicates.slice(0, 5)
    );
  }
}

/**
 * Asserts that all items in a collection have a required field.
 * Logs an error to console if any items are missing the field.
 */
export function assertNoNulls<T>(
  context: string,
  items: T[],
  fieldName: keyof T
): void {
  if (import.meta.env.PROD) return;
  
  const nullItems = items.filter(item => item[fieldName] == null);
  
  if (nullItems.length > 0) {
    console.error(
      `[DATA INTEGRITY] ${context}: Found ${nullItems.length} items with null ${String(fieldName)}!`
    );
  }
}
