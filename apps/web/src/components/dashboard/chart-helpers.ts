const PALETTE = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
  "bg-muted-foreground/60",
];

/** One stable color per status across every chart on the page. */
export function statusColors(statuses: readonly string[]): Map<string, string> {
  const colors = new Map<string, string>();
  for (const status of statuses) {
    if (!colors.has(status)) {
      colors.set(status, PALETTE[colors.size % PALETTE.length] as string);
    }
  }
  return colors;
}

/** Whole-number percent; an empty total reads as 0 rather than NaN. */
export function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}
