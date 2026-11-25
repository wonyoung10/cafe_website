export function maskLoginId(value: string): string {
  return value.slice(0, -2) + '**';
}
