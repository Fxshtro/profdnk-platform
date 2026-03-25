export const PARTICIPANT_MIN = 1;
export const PARTICIPANT_MAX = 31;

export function clampParticipant(n: number): number {
  return Math.min(
    PARTICIPANT_MAX,
    Math.max(PARTICIPANT_MIN, Math.round(Number.isFinite(n) ? n : PARTICIPANT_MIN))
  );
}

export function readParticipantLimits(
  cfg: Record<string, unknown> | undefined
): { min: number; max: number } | null {
  if (!cfg || typeof cfg !== 'object') return null;
  const minRaw = cfg.minParticipants ?? cfg.min_participants;
  const maxRaw = cfg.maxParticipants ?? cfg.max_participants;
  const minN = typeof minRaw === 'number' ? minRaw : typeof minRaw === 'string' ? parseInt(minRaw, 10) : NaN;
  const maxN = typeof maxRaw === 'number' ? maxRaw : typeof maxRaw === 'string' ? parseInt(maxRaw, 10) : NaN;
  const hasMin = Number.isFinite(minN);
  const hasMax = Number.isFinite(maxN);
  if (!hasMin && !hasMax) return null;
  let min = hasMin ? clampParticipant(minN) : PARTICIPANT_MIN;
  let max = hasMax ? clampParticipant(maxN) : PARTICIPANT_MAX;
  if (min > max) [min, max] = [max, min];
  return { min, max };
}

export function formatParticipantRange(cfg: Record<string, unknown> | undefined): string {
  const limits = readParticipantLimits(cfg);
  if (!limits) return `${PARTICIPANT_MIN} – ${PARTICIPANT_MAX} чел.`;
  return `${limits.min} – ${limits.max} чел.`;
}
