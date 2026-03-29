import type { Metric } from '@/types';

export interface ParsedSubmissionMetric {
  id: string;
  name: string;
  value: number;
  color?: string;
  description?: string;
}

export function formatMetricValueDisplay(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 1000) / 1000);
}

export function parseSubmissionMetricsWithConfig(
  metrics: Record<string, unknown> | null | undefined,
  configMetrics: Metric[] | undefined
): ParsedSubmissionMetric[] {
  if (!metrics || typeof metrics !== 'object') return [];
  const byId = new Map((configMetrics ?? []).map((m) => [m.id, m]));
  return Object.entries(metrics).map(([id, raw]) => {
    const def = byId.get(id);
    if (raw && typeof raw === 'object' && raw !== null && 'value' in raw) {
      const o = raw as { name?: unknown; value: unknown };
      const name =
        typeof o.name === 'string' && o.name.trim() !== ''
          ? o.name
          : def?.name ?? id;
      const v = o.value;
      const value =
        typeof v === 'number'
          ? v
          : typeof v === 'string'
            ? parseFloat(v)
            : NaN;
      return {
        id,
        name,
        value: Number.isFinite(value) ? value : 0,
        color: def?.color,
        description: def?.description,
      };
    }
    if (typeof raw === 'number') {
      return {
        id,
        name: def?.name ?? id,
        value: raw,
        color: def?.color,
        description: def?.description,
      };
    }
    return {
      id,
      name: def?.name ?? id,
      value: 0,
      color: def?.color,
      description: def?.description,
    };
  });
}

export function countQuestionsInTest(
  test:
    | { config_json?: unknown; questions?: unknown }
    | undefined
): number {
  if (!test) return 0;
  const cfg = test.config_json as { questions?: unknown[] } | undefined;
  if (Array.isArray(cfg?.questions)) return cfg.questions.length;
  if (Array.isArray(test.questions)) return test.questions.length;
  return 0;
}
