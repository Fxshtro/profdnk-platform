export function filterPhoneDigits(value: string, maxDigits = 15): string {
  return value.replace(/\D/g, '').slice(0, maxDigits);
}
