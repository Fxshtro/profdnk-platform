'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Minus, Plus } from 'lucide-react';
import { api, ApiError } from '@/lib/api/client';
import { psychologistApi, type Submission } from '@/lib/api/psychologist';
import { escapeHtml, metricsToReportRows, type ReportScoreRow } from '@/lib/report-html';

const PREDEFINED_PHRASES = [
  'Клиент демонстрирует высокий уровень мотивации к профессиональному развитию и самосовершенствованию.',
  'Наблюдается склонность к аналитическому мышлению и системному подходу в решении задач.',
  'Рекомендуется развитие коммуникативных навыков для улучшения взаимодействия в коллективе.',
  'Клиент обладает выраженными лидерскими качествами и способностью брать на себя ответственность.',
  'Выявлена потребность в стабильности и предсказуемости рабочей среды.',
  'Клиенту подойдут профессии, связанные с творчеством и самовыражением.',
  'Наблюдается высокий уровень эмпатии и способности к пониманию других людей.',
  'Рекомендуется рассмотреть профессии в сфере образования или консультирования.',
  'Клиент демонстрирует интерес к техническим дисциплинам и точным наукам.',
  'Выявлена склонность к работе с информацией и аналитическими данными.',
];

interface MeProfile {
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  specialization?: string;
}

function buildScoreRows(sub: Submission | undefined): ReportScoreRow[] {
  if (!sub) return [];
  const fromMetrics = metricsToReportRows(sub.metrics);
  if (fromMetrics.length > 0) return fromMetrics;
  if (typeof sub.score === 'number' && Number.isFinite(sub.score)) {
    return [{ metricName: 'Показатель заполнения', value: sub.score }];
  }
  return [];
}

interface SpecialistMailInfo {
  fullName: string;
  email: string;
  phone: string;
}

function buildMailtoToClientHref(clientEmail: string, specialist: SpecialistMailInfo): string {
  const parts: string[] = ['Profdnk', specialist.fullName, specialist.email];
  const ph = specialist.phone.trim();
  if (ph && ph !== '—') {
    parts.push(ph);
  }
  const subject = parts.join(' — ');
  return `mailto:${clientEmail}?${new URLSearchParams({ subject }).toString()}`;
}

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
  const [customComment, setCustomComment] = useState('');
  const [phrasesExpanded, setPhrasesExpanded] = useState(false);
  const [reportFormat, setReportFormat] = useState<'html' | 'txt'>('html');

  // Читаем resultId из URL при загрузке страницы
  useEffect(() => {
    const resultIdParam = searchParams.get('resultId');
    if (resultIdParam) {
      const resultId = Number(resultIdParam);
      if (Number.isFinite(resultId)) {
        setSelectedSubmissionId(resultId);
      }
    }
  }, [searchParams]);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<MeProfile>('/auth/me'),
  });

  const {
    data: submissions = [],
    isLoading: submissionsLoading,
    isError: submissionsError,
    error: submissionsErr,
  } = useQuery({
    queryKey: ['allSubmissions'],
    queryFn: psychologistApi.getAllSubmissions,
  });

  const specialist = useMemo(() => {
    if (!me) {
      return {
        fullName: '…',
        email: '…',
        phone: '—',
        specialization: 'Профориентолог, карьерный консультант',
      };
    }
    return {
      fullName: me.full_name,
      email: me.email,
      phone: me.phone?.trim() || '—',
      specialization:
        me.role === 'admin'
          ? 'Администратор платформы'
          : me.specialization?.trim() || 'Профориентолог, карьерный консультант',
    };
  }, [me]);

  const selectedSubmission = useMemo(
    () => submissions.find((s) => s.id === selectedSubmissionId),
    [submissions, selectedSubmissionId]
  );

  const appendPhrase = (index: number): void => {
    setCustomComment((prev) => prev + (prev ? '\n' : '') + PREDEFINED_PHRASES[index]);
  };

  const handleGenerateReport = () => {
    const sub = selectedSubmission;
    if (!sub) {
      alert('Выберите прохождение из списка слева.');
      return;
    }

    const scoreRows = buildScoreRows(sub);
    const surveyTitle = escapeHtml(sub.test?.title || `Тест #${sub.test_id}`);
    const clientName = escapeHtml(sub.client_name || 'Не указано');
    const clientEmail = escapeHtml(sub.client_email || 'Не указано');
    const clientPhone = sub.client_phone?.trim();
    const completedAt = new Date(sub.created_at).toLocaleDateString('ru-RU');
    const commentBlock = escapeHtml(customComment || 'Текст отчёта не добавлен');

    const clientPhoneHtml = clientPhone
      ? `<p><strong>Телефон</strong>${escapeHtml(clientPhone)}</p>`
      : '';

    if (reportFormat === 'html') {
      const metricsSection =
        scoreRows.length > 0
          ? `
        <div class="section">
          <div class="section-title">Показатели</div>
          <div class="metrics">
        ${scoreRows
          .map(
            (score) => `
            <div class="metric-card">
              <div class="metric-value">${escapeHtml(String(score.value))}</div>
              <div class="metric-label">${escapeHtml(score.metricName)}</div>
            </div>
          `
          )
          .join('')}
          </div>
        </div>
      `
          : '';

      const reportHtml = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Клиентский отчёт · ПрофДНК</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Unbounded:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      /* Тёмная тема (как .dark на сайте) */
      --page: #0a0a0a;
      --card: #171717;
      --foreground: #ededed;
      --muted: #262626;
      --muted-foreground: #a1a1aa;
      --primary: #ededed;
      --primary-foreground: #0a0a0a;
      --border: #404040;
      --radius: 8px;
      color-scheme: dark;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Jost", system-ui, sans-serif;
      line-height: 1.6;
      color: var(--foreground);
      background: var(--page);
      padding: 24px 16px 48px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .wrap { max-width: 720px; margin: 0 auto; }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.45);
    }
    .header {
      background: var(--primary);
      color: var(--primary-foreground);
      padding: 28px 32px;
    }
    .header .brand {
      font-family: "Unbounded", system-ui, sans-serif;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      opacity: 0.72;
      margin-bottom: 10px;
    }
    .header h1 {
      font-family: "Unbounded", system-ui, sans-serif;
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      text-transform: uppercase;
      line-height: 1.25;
      margin-bottom: 8px;
    }
    .header .subtitle {
      font-size: 0.95rem;
      font-weight: 500;
      opacity: 0.88;
      line-height: 1.4;
    }
    .content { padding: 28px 32px 32px; }
    .section { margin-bottom: 28px; }
    .section:last-of-type { margin-bottom: 0; }
    .section-title {
      font-family: "Unbounded", system-ui, sans-serif;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--muted-foreground);
      margin-bottom: 14px;
    }
    .panel {
      background: var(--muted);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 18px 20px;
    }
    .panel p { margin: 0 0 10px; font-size: 0.9375rem; }
    .panel p:last-child { margin-bottom: 0; }
    .panel strong {
      color: var(--muted-foreground);
      font-weight: 500;
      margin-right: 6px;
    }
    .report-text {
      background: var(--page);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px 22px;
      white-space: pre-wrap;
      line-height: 1.75;
      font-size: 0.9375rem;
      color: var(--foreground);
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 12px;
    }
    .metric-card {
      background: var(--page);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px 14px;
      text-align: center;
    }
    .metric-value {
      font-family: "Unbounded", system-ui, sans-serif;
      font-size: 1.35rem;
      font-weight: 600;
      color: var(--primary);
      margin-bottom: 6px;
      line-height: 1.2;
    }
    .metric-label {
      font-size: 0.75rem;
      color: var(--muted-foreground);
      line-height: 1.35;
    }
    .contact-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px 20px;
    }
    .contact-item { font-size: 0.9375rem; }
    .contact-item .label {
      display: block;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted-foreground);
      margin-bottom: 4px;
    }
    .footer {
      text-align: center;
      padding: 18px 24px 22px;
      font-size: 0.75rem;
      color: var(--muted-foreground);
      border-top: 1px solid var(--border);
      background: var(--muted);
    }
    @media (max-width: 600px) {
      body { padding: 12px 12px 32px; }
      .header, .content { padding-left: 20px; padding-right: 20px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="header">
        <div class="brand">ПрофДНК</div>
        <h1>Клиентский отчёт</h1>
        <p class="subtitle">${surveyTitle}</p>
      </div>
      <div class="content">
        <div class="section">
          <div class="section-title">Информация о клиенте</div>
          <div class="panel">
            <p><strong>ФИО</strong>${clientName}</p>
            <p><strong>Email</strong>${clientEmail}</p>${clientPhoneHtml}
            <p><strong>Дата прохождения</strong>${completedAt}</p>
          </div>
        </div>

        ${metricsSection}

        <div class="section">
          <div class="section-title">Рекомендации и комментарий</div>
          <div class="report-text">${commentBlock}</div>
        </div>

        <div class="section">
          <div class="section-title">Контакты специалиста</div>
          <div class="panel">
            <div class="contact-grid">
              <div class="contact-item">
                <span class="label">ФИО</span>
                ${escapeHtml(specialist.fullName)}
              </div>
              <div class="contact-item">
                <span class="label">Специализация</span>
                ${escapeHtml(specialist.specialization)}
              </div>
              <div class="contact-item">
                <span class="label">Email</span>
                ${escapeHtml(specialist.email)}
              </div>
              <div class="contact-item">
                <span class="label">Телефон</span>
                ${escapeHtml(specialist.phone)}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} ПрофДНК — платформа для профориентологов
      </div>
    </div>
  </div>
</body>
</html>`;

      const blob = new Blob([reportHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `client-report-${Date.now()}.html`;
      link.click();
      URL.revokeObjectURL(url);

      // Не используем btoa(reportHtml): на кириллице/Unicode браузер даёт InvalidCharacterError.
      // Полный отчёт — в скачанном файле; «короткая ссылка» из обрезанного base64 нерабочая.
      const notice =
        'HTML отчёт сохранён на ваш компьютер.\n\nОтправьте скачанный файл клиенту (почта, мессенджер).';
      void navigator.clipboard.writeText(notice.split('\n\n')[0]).catch(() => {});
      alert(notice);
    } else {
      const metricsTxt =
        scoreRows.length > 0
          ? '\n' +
            scoreRows.map((r) => `${r.metricName}: ${r.value}`).join('\n') +
            '\n'
          : '';
      const phoneLine = clientPhone ? `\nТелефон: ${clientPhone}` : '';
      const reportContent = `
КЛИЕНТСКИЙ ОТЧЁТ
=================
Тест: ${sub.test?.title || `ID ${sub.test_id}`}
Клиент: ${sub.client_name}
Email: ${sub.client_email}${phoneLine}
Дата: ${completedAt}
${metricsTxt}
---
${customComment}

=================
С уважением, ${specialist.fullName}
${specialist.specialization}
Email: ${specialist.email}
Тел: ${specialist.phone}
      `.trim();
      
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `client-report-${Date.now()}.txt`;
      link.click();
      URL.revokeObjectURL(url);
      alert('Текстовый отчёт сгенерирован и скачан!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold uppercase tracking-tight font-unbounded">Клиентские отчёты</h1>
        <p className="text-muted-foreground mt-1">
          Генерация отчётов для клиентов с рекомендациями
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Список результатов */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Результаты тестирований</CardTitle>
            <CardDescription>Выберите клиента для создания отчёта</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {submissionsLoading && (
              <p className="text-sm text-muted-foreground py-4 text-center">Загрузка прохождений…</p>
            )}
            {submissionsError && (
              <p className="text-sm text-destructive py-2">
                {submissionsErr instanceof ApiError
                  ? submissionsErr.message
                  : 'Не удалось загрузить список. Войдите как психолог.'}
              </p>
            )}
            {!submissionsLoading && !submissionsError && submissions.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Пока нет прохождений ваших тестов.{' '}
                <Link href="/surveys" className="text-primary underline">
                  Мои опросники
                </Link>
              </p>
            )}
            {!submissionsLoading &&
              !submissionsError &&
              submissions.map((result) => (
                <Button
                  key={result.id}
                  variant={selectedSubmissionId === result.id ? 'primary' : 'outline'}
                  className="w-full justify-start h-auto py-3"
                  onClick={() => {
                    setSelectedSubmissionId(result.id);
                    setCustomComment('');
                    setPhrasesExpanded(false);
                  }}
                >
                  <div className="text-left">
                    <p className="font-medium">{result.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {result.test?.title || `Тест #${result.test_id}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(result.created_at).toLocaleString('ru-RU')}
                    </p>
                  </div>
                </Button>
              ))}
          </CardContent>
        </Card>

        {/* Конструктор отчёта */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Конструктор отчёта</CardTitle>
            <CardDescription>
              Выберите заготовленные фразы или добавьте свой комментарий
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedSubmissionId != null && selectedSubmission ? (
              <>
                {/* Информация о клиенте */}
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Клиент</h3>
                    <Badge variant="success">Выбран</Badge>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">ФИО</p>
                      <p className="font-medium">{selectedSubmission.client_name}</p>
                    </div>
                    {selectedSubmission.client_email && (
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{selectedSubmission.client_email}</p>
                      </div>
                    )}
                    {selectedSubmission.client_phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Телефон</p>
                        <p className="font-medium">{selectedSubmission.client_phone}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Тест</p>
                      <p className="font-medium">{selectedSubmission.test?.title || `Тест #${selectedSubmission.test_id}`}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Дата прохождения</p>
                      <p className="font-medium">
                        {new Date(selectedSubmission.created_at).toLocaleString('ru-RU')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Заготовленные фразы */}
                <div>
                  <Label className="mb-3 block">Заготовленные фразы (нажмите для добавления)</Label>
                  {!phrasesExpanded ? (
                    <div className="space-y-2">
                      <div className="grid gap-2 lg:grid-cols-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-auto py-3 text-sm justify-start text-left"
                          onClick={() => appendPhrase(0)}
                        >
                          <span className="line-clamp-2">{PREDEFINED_PHRASES[0]}</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="hidden h-auto py-3 text-sm justify-start text-left lg:flex"
                          onClick={() => appendPhrase(1)}
                        >
                          <span className="line-clamp-2">{PREDEFINED_PHRASES[1]}</span>
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-auto w-full gap-2 py-3 text-sm"
                        onClick={() => setPhrasesExpanded(true)}
                        aria-expanded={false}
                      >
                        <Plus className="h-4 w-4 shrink-0" aria-hidden />
                        Показать ещё фразы
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {PREDEFINED_PHRASES.map((phrase, index) => (
                          <Button
                            key={index}
                            type="button"
                            variant="outline"
                            className="h-auto py-3 text-sm justify-start text-left"
                            onClick={() => appendPhrase(index)}
                          >
                            <span className="line-clamp-2">{phrase}</span>
                          </Button>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-auto w-full gap-2 py-3 text-sm"
                        onClick={() => setPhrasesExpanded(false)}
                        aria-expanded={true}
                      >
                        <Minus className="h-4 w-4 shrink-0" aria-hidden />
                        Скрыть лишние фразы
                      </Button>
                    </div>
                  )}
                </div>

                {/* Текстовое поле */}
                <div className="space-y-2">
                  <Label htmlFor="comment">Текст отчёта</Label>
                  <Textarea
                    id="comment"
                    value={customComment}
                    onChange={(e) => setCustomComment(e.target.value)}
                    placeholder="Выберите фразы выше или напишите свой комментарий..."
                    className="min-h-[200px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Длина: {customComment.length} символов (рекомендуется 100-150)
                  </p>
                </div>

                {/* Выбор формата */}
                <div className="space-y-2">
                  <Label>Формат отчёта</Label>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant={reportFormat === 'html' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setReportFormat('html')}
                      className="flex-1"
                    >
                      HTML
                    </Button>
                    <Button
                      type="button"
                      variant={reportFormat === 'txt' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setReportFormat('txt')}
                      className="flex-1"
                    >
                      TXT
                    </Button>
                  </div>
                </div>

                {/* Контакты психолога */}
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                  <h4 className="font-semibold">Контакты специалиста (из профиля)</h4>
                  <div className="grid gap-2 sm:grid-cols-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">ФИО</p>
                      <p className="font-medium">{specialist.fullName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Специализация</p>
                      <p className="font-medium">{specialist.specialization}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{specialist.email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Телефон</p>
                      <p className="font-medium">{specialist.phone}</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  <Link href={`/results/${selectedSubmission.id}`} className="text-primary underline">
                    Открыть карточку результата
                  </Link>
                </p>

                {/* Кнопки действий */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <Button onClick={handleGenerateReport} className="w-full min-w-0 sm:flex-1">
                    Скачать {reportFormat.toUpperCase()} отчёт
                  </Button>
                  {selectedSubmission.client_email?.trim() ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full shrink-0 whitespace-nowrap sm:w-auto sm:min-w-0"
                      title="Открыть почтовый клиент с адресом клиента"
                      onClick={() => {
                        const to = selectedSubmission.client_email?.trim();
                        if (!to) return;
                        window.location.href = buildMailtoToClientHref(to, specialist);
                      }}
                    >
                      Почта клиенту
                    </Button>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold">Выберите клиента</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Выберите результат тестирования из списка слева
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
