export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface ReportScoreRow {
  metricName: string;
  value: string | number;
}

export function metricsToReportRows(
  metrics: Record<string, unknown> | null | undefined
): ReportScoreRow[] {
  if (!metrics || typeof metrics !== 'object') return [];
  return Object.values(metrics).flatMap((v) => {
    if (v && typeof v === 'object' && v !== null && 'name' in v && 'value' in v) {
      const o = v as { name: string; value: unknown };
      return [{ metricName: String(o.name), value: formatMetricValue(o.value) }];
    }
    return [];
  });
}

function formatMetricValue(v: unknown): string | number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'boolean') return v ? 'Да' : 'Нет';
  if (v == null) return '—';
  return String(v);
}
