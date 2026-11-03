/** Whole-number percent; an empty total reads as 0 rather than NaN. */
export function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}
