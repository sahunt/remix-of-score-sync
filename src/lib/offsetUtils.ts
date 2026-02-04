/**
 * Offset conversion utilities - SINGLE SOURCE OF TRUTH
 * Matches the exact logic used in edi-chat edge function
 * 
 * Database: song_bias.bias_ms (raw timing value)
 * User-facing offset: Math.round(-bias_ms)
 * 
 * Examples:
 * - bias_ms = 5.81  → User sees "-6ms"
 * - bias_ms = -3.08 → User sees "+3ms"
 * - bias_ms = 0.73  → User sees "-1ms"
 */

/**
 * Convert database bias_ms to user-facing offset integer
 * The sign is inverted: positive bias = negative offset for user
 */
export function biasToUserOffset(biasMs: number): number {
  return Math.round(-biasMs);
}

/**
 * Convert user-facing offset back to database bias_ms
 * Inverse of biasToUserOffset
 */
export function userOffsetToBias(userOffset: number): number {
  return -userOffset;
}

/**
 * Format offset for display with sign and "ms" suffix
 * Returns "+3ms", "-6ms", or null if no offset
 */
export function formatOffset(offset: number | null): string | null {
  if (offset === null || offset === undefined) return null;
  const sign = offset >= 0 ? '+' : '';
  return `${sign}${offset}ms`;
}
