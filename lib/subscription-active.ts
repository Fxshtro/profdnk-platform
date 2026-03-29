export interface SubscriptionCheckFields {
  is_active: boolean;
  is_blocked: boolean;
  access_expires_at: string | null;
}

export function isPsychologistSubscriptionActive(
  psychologist: SubscriptionCheckFields,
  nowMs: number = Date.now()
): boolean {
  if (!psychologist.is_active || psychologist.is_blocked) return false;
  if (!psychologist.access_expires_at) return false;
  const endDate = new Date(psychologist.access_expires_at);
  const daysUntilExpiry = Math.max(
    0,
    Math.ceil((endDate.getTime() - nowMs) / (1000 * 60 * 60 * 24))
  );
  return daysUntilExpiry > 0;
}
