'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/features/ThemeToggle';

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Сброс позиции страницы наверх при загрузке
    window.scrollTo(0, 0);
    
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Плавная прокрутка к якорю
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  const features = [
    {
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      title: 'Конструктор тестов',
      description: 'Создавайте методики за минуты без программирования. 6 типов вопросов, гибкие настройки.',
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: 'Мгновенные результаты',
      description: 'Автоматический расчёт показателей. Клиентские и профессиональные отчёты в один клик.',
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      title: 'Работа с клиентами',
      description: 'Персональные ссылки для прохождения. База клиентов с историей тестирований.',
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: 'Аналитика и метрики',
      description: 'Статистика прохождений. Динамика результатов. Наглядные графики и диаграммы.',
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      title: 'Безопасность данных',
      description: 'Шифрование информации. Соответствие стандартам. Надёжное хранение данных клиентов.',
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      ),
      title: 'Облачный доступ',
      description: 'Работайте с любого устройства. Не нужно устанавливать ПО. Всегда актуальная версия.',
    },
  ];

  const stats = [
    { value: '500+', label: 'Психологов уже используют' },
    { value: '10,000+', label: 'Тестирований проведено' },
    { value: '98%', label: 'Довольных клиентов' },
    { value: '24/7', label: 'Поддержка' },
  ];

  const steps = [
    {
      number: '01',
      title: 'Создайте тест',
      description: 'Используйте конструктор для создания методики. Выберите типы вопросов, настройте шкалы.',
    },
    {
      number: '02',
      title: 'Отправьте клиенту',
      description: 'Сгенерируйте персональную ссылку и отправьте клиенту для прохождения.',
    },
    {
      number: '03',
      title: 'Получите результат',
      description: 'Автоматический расчёт показателей. Готовые отчёты для клиента и специалиста.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />

      {/* Header */}
      <header
        className={`sticky top-0 z-50 w-full border-b transition-all duration-300 px-5 ${
          scrolled ? 'bg-background/95 backdrop-blur shadow-lg' : 'bg-transparent'
        }`}
      >
        <div className="container2 flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-unbounded font-bold">ПрофДНК</span>
          </Link>
          <nav className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost">Вход</Button>
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="container2">
          <div className="mx-auto max-w-5xl text-center">
            <Badge
              variant="secondary"
              className={`mb-6 px-4 py-2 text-sm transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              ✨ Платформа нового поколения для профориентологов
            </Badge>

            {/* Headline */}
            <h1
              className={`text-4xl font-unbounded font-bold tracking-tight sm:text-6xl md:text-7xl transition-all duration-700 delay-100 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              Раскройте потенциал{' '}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                каждого клиента
              </span>
            </h1>

            {/* Subheadline */}
            <p
              className={`mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl transition-all duration-700 delay-200 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              Создавайте профессиональные тесты, проводите диагностику и формируйте отчёты 
              за минуты, а не часы. Без программирования и сложных настроек.
            </p>

            {/* CTA Buttons */}
            <div
              className={`mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row transition-all duration-700 delay-300 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <Link href="/login">
                <Button size="lg" className="h-12 px-8 text-base font-medium shadow-lg shadow-primary/25">
                  Начать бесплатно
                  <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Button>
              </Link>
              <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')}>
                <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                  Как это работает
                </Button>
              </a>
            </div>

            {/* Social Proof */}
            <div
              className={`mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground transition-all duration-700 delay-400 ${
                isVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Без кредитной карты</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>14 дней бесплатно</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Отмена в любой момент</span>
              </div>
            </div>
          </div>
        </div>

        {/* Animated background elements */}
        <div className="absolute top-1/4 left-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-10 h-96 w-96 rounded-full bg-primary/5 blur-3xl animate-pulse delay-1000" />
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/30 py-16">
        <div className="container2">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center"
              >
                <div className="text-3xl font-bold font-unbounded sm:text-4xl md:text-5xl">
                  {stat.value}
                </div>
                <div className="mt-2 text-sm text-muted-foreground sm:text-base">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 sm:py-32">
        <div className="container2">
          <div className="mx-auto max-w-5xl">
            {/* Section Header */}
            <div className="text-center">
              <Badge variant="secondary" className="mb-4 px-4 py-2">
                Возможности
              </Badge>
              <h2 className="text-3xl font-unbounded font-bold sm:text-4xl md:text-5xl">
                Всё необходимое для{' '}
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  эффективной работы
                </span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                Инструменты, которые экономят время и повышают качество консультаций
              </p>
            </div>

            {/* Features Grid */}
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <Card
                  key={index}
                  className="group relative overflow-hidden border-muted bg-card/50 backdrop-blur transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1"
                >
                  <CardContent className="p-6">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="border-t py-20 sm:py-32 bg-muted/30">
        <div className="container2">
          <div className="mx-auto max-w-5xl">
            {/* Section Header */}
            <div className="text-center">
              <Badge variant="secondary" className="mb-4 px-4 py-2">
                Как это работает
              </Badge>
              <h2 className="text-3xl font-unbounded font-bold sm:text-4xl md:text-5xl">
                Три простых шага к{' '}
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  результату
                </span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                Начните работать за минуты, а не дни
              </p>
            </div>

            {/* Steps */}
            <div className="mt-16 grid gap-8 sm:grid-cols-3">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="relative"
                >
                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="absolute top-12 left-1/2 hidden h-0.5 w-full bg-gradient-to-r from-primary/50 to-transparent sm:block" />
                  )}
                  
                  <div className="relative text-center">
                    {/* Number */}
                    <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-white text-3xl font-bold text-primary-foreground shadow-lg shadow-primary/25">
                      {step.number}
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-xl font-semibold">{step.title}</h3>
                    <p className="mt-3 text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32">
        <div className="container2">
          <div className="mx-auto max-w-4xl">
            <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
              <CardContent className="p-8 sm:p-12 text-center">
                <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
                
                <div className="relative">
                  <h2 className="text-3xl font-unbounded font-bold sm:text-4xl md:text-5xl">
                    Готовы начать?
                  </h2>
                  <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
                    Присоединяйтесь к сотням психологов, которые уже используют ПрофДНК 
                    для развития своей практики
                  </p>
                  
                  <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <Link href="/login">
                      <Button
                        size="lg"
                        variant="secondary"
                        className="h-12 px-8 text-base font-medium shadow-lg"
                      >
                        Подать заявку
                        <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Button>
                    </Link>
                  </div>
                  
                  <p className="mt-6 text-sm text-primary-foreground/60">
                    14 дней бесплатно • Без кредитной карты
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container2 px-5">
          <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
            <div className='w-full'>
              <h3 className="mb-4 text-sm font-unbounded font-bold">ПрофДНК</h3>
              <p className="text-sm text-muted-foreground">
                Платформа для профориентологов и психологов
              </p>
            </div>
            <div className='w-full text-right'>
              <h3 className="mb-4 text-sm font-unbounded font-bold">Контакты</h3>
              <p className="text-sm text-muted-foreground">
                Хакатон ТГАМТ ДГТУ 2026
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
