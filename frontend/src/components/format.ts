export function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

