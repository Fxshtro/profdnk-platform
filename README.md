# 🇺🇸 ProfDNK — English

[![Next.js 16.2.0](https://img.shields.io/badge/Next.js-16.2.0-black.svg)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![TailwindCSS v4](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status](https://img.shields.io/badge/status-in%20development-orange.svg)](https://github.com/Fxshtro/profdnk)

> [!NOTE]
> **This project is currently in active development.** Docker containerization is planned for a future release.

**Psychological testing platform for creating, conducting, and analyzing assessments.**

ProfDNK is an intelligent platform for creating methodological questionnaires, conducting client assessments, and receiving detailed analytical reports with result visualizations. Build surveys, manage clients, and generate professional PDF reports.

---

## ✨ Features

- 🛠️ **Survey Builder** — Visual constructor for creating questionnaires without code
- 📊 **Analytics Dashboard** — Detailed statistics for each assessment with charts
- 📄 **Report Generation** — Automatic PDF report creation with interpretations
- 👥 **Client Management** — Client database with complete testing history
- 🔐 **Role-Based Access** — Access control: Administrator, Psychologist, Client, Guest
- 💳 **Subscription System** — Tiered pricing plans for psychologists
- 📱 **Responsive Design** — Full mobile device support
- 🎨 **Dark Mode** — Built-in light/dark theme toggle

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 15+ (for backend)
- Python 3.10+ (for backend server)

### Installation

```bash
# Clone the repository
git clone https://github.com/Fxshtro/profdnk.git
cd profdnk

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
python3 -m venv .venv
.venv\Scripts\activate  # Windows
# or
source .venv/bin/activate  # Linux/macOS
pip install -r requirements.txt
```

### Running in Development

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd backend
export PYTHONPATH=.
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Frontend:** [http://localhost:3000](http://localhost:3000)  
**Backend API:** [http://127.0.0.1:8000](http://127.0.0.1:8000)  
**API Documentation:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 📖 Usage

### User Roles

#### Guest
| Page | Description |
|------|-------------|
| `/` | Platform landing page with feature overview |
| `/apply` | Application for psychologist registration |

#### Psychologist
| Page | Description |
|------|-------------|
| `/login` | System authentication |
| `/dashboard` | Personal dashboard with overview statistics |
| `/surveys` | Survey management (create, edit, delete) |
| `/builder` | Visual survey constructor |
| `/results` | Client assessment results |
| `/reports` | Report generation and viewing |
| `/subscription` | Subscription and plan management |
| `/profile` | User profile settings |

#### Administrator
| Page | Description |
|------|-------------|
| `/admin/(auth)/login` | Administrator panel login |
| `/admin/applications` | Review psychologist registration applications |
| `/admin/applications-request` | Application review requests |
| `/admin/psychologists` | Psychologist account management |
| `/admin/subscriptions` | Subscription plan management |

#### Client
| Page | Description |
|------|-------------|
| `/client/[surveyId]` | Take assessment via personal link |
| `/p/[token]` | Public survey participation |

### Example Workflows

| Scenario | Steps |
|----------|-------|
| **Create Survey** | Dashboard → Builder → Add Questions → Save → Generate Link |
| **Client Assessment** | Share Link → Client Completes → View Results → Generate Report |
| **Review Application** | Admin Panel → Applications → Review → Approve/Reject |

---

## 🏗️ Architecture

```
┌─────────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Frontend (Next)   │ ───► │  Backend (FastAPI)│ ───► │  PostgreSQL DB   │
│   React 19 + TS     │      │  Python + Uvicorn │      │  + SQLite (opt)  │
└─────────────────────┘      └──────────────────┘      └───────────────────┘
         ▲                           ▲
         │                           │
    ┌──────────────┐          ┌──────────────┐
    │ TailwindCSS  │          │   JWT Auth   │
    │   Radix UI   │          │   CORS       │
    └──────────────┘          └──────────────┘
```

### Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | Next.js 16 + React 19 | SSR/SSG, routing, UI logic |
| **State Management** | TanStack Query | API caching and synchronization |
| **Forms** | React Hook Form + Zod | Validation and form management |
| **UI Library** | Radix UI Primitives | Accessible components |
| **Styling** | TailwindCSS v4 | Utility-first CSS |
| **Backend** | FastAPI (Python) | REST API, business logic |
| **Database** | PostgreSQL / SQLite | Data storage |
| **Authentication** | JWT | Token-based auth |

### Typography

- **Headings:** Unbounded (Google Fonts)
- **Body Text:** Jost (Google Fonts)

---

## ⚙️ Configuration

### Environment Variables (Backend)

Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/profdnk
USE_SQLITE=false

JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

CORS_ORIGINS=http://localhost:3000,http://localhost:8080

INITIAL_ADMIN_EMAIL=admin@profdnk.ru
INITIAL_ADMIN_PASSWORD=admin123
INITIAL_ADMIN_FULL_NAME=Administrator
```

### PostgreSQL

**Install** PostgreSQL 15+ and ensure the service is running.

**Create a database** (name must match the last segment of `DATABASE_URL`, default is `profdnk`):

```bash
psql -U postgres
```

```sql
CREATE DATABASE profdnk;
```

Exit `psql` with `\q` (or close the terminal).

**Apply the schema** from the repository root:

```bash
psql -U postgres -d profdnk -f "C:\profdnk-platform\backend\database\schema.sql"
```

Or from the `backend/` directory:

```bash
psql -U postgres -d profdnk -f database/schema.sql
```

**Drop and recreate** the database (e.g. after schema changes or a clean reinstall). Terminate active connections first if the DB is in use:

```bash
psql -U postgres
```

```sql
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'profdnk' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS profdnk;
CREATE DATABASE profdnk;
```

Then exit `psql` (`\q`) and apply `schema.sql` again as above.

> [!NOTE]
> Do **not** add `?schema=public` to `DATABASE_URL`. PostgreSQL uses the `public` schema by default, and `psycopg2` rejects that query string as an invalid connection option.

### Apply Migrations

```bash
cd backend
python migrate.py
```

### Change Database Connection

Edit `.env` in `backend/`:

```env
# For PostgreSQL
DATABASE_URL=postgresql://user:password@host:port/database
USE_SQLITE=false

# For SQLite (development)
DATABASE_URL=sqlite:///./dev.db
USE_SQLITE=true
```

---

## 🛠️ Troubleshooting

### Database Connection Errors

Ensure PostgreSQL is running and connection parameters are correct:

```bash
# Check PostgreSQL status (Linux/macOS)
sudo systemctl status postgresql

# Test connection
psql -U postgres -d profdnk -c "SELECT 1"
```

### CORS Errors

Verify `CORS_ORIGINS` setting in backend `.env`:

```env
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
```

### JWT Issues

Ensure `JWT_SECRET_KEY` is set and matches on both frontend and backend.

### Port Conflicts

If port 3000 or 8000 is in use, modify the launch commands:

```bash
# Frontend
PORT=3001 npm run dev

# Backend
uvicorn app.main:app --reload --port 8001
```

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the modern React framework
- [Radix UI](https://www.radix-ui.com/) for accessible UI components
- [TailwindCSS](https://tailwindcss.com/) for utility-first styling
- [FastAPI](https://fastapi.tiangolo.com/) for high-performance backend
- [TanStack Query](https://tanstack.com/query) for server state management
- [Zod](https://zod.dev/) for TypeScript-first validation

---

## 📬 Contact

- **Issues**: [GitHub Issues](https://github.com/Fxshtro/profdnk/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Fxshtro/profdnk/discussions)

---

## 👥 Team

| Role | Member | Telegram |
|------|--------|----------|
| **Frontend Development** | Daniil | [@Fxshtro](https://t.me/Fxshtro) |
| **Backend Development** | Arseniy | [@two_ghoul](https://t.me/two_ghoul) |
| **Manager** | Victoria | [@nyametado](https://t.me/nyametado) |

**Hackathon DGTU 2026**

---

<div align="center">

**Status:** 🟢 Working Prototype (MVP)

**Built with ❤️ for psychologists and their clients**

[⬆ Back to Top](#-profdnk--english)

</div>

---

# 🇷🇺 ProfDNK — Русский

[![Next.js 16.2.0](https://img.shields.io/badge/Next.js-16.2.0-black.svg)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![TailwindCSS v4](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status](https://img.shields.io/badge/status-in%20development-orange.svg)](https://github.com/Fxshtro/profdnk)

> [!NOTE]
> **Проект находится в активной разработке.** Docker-контейнеризация запланирована в будущих релизах.

**Платформа для психологического тестирования: создание, проведение и анализ опросников.**

ProfDNK — интеллектуальная платформа для создания методических опросников, проведения тестирований клиентов и получения детальных аналитических отчётов с визуализацией результатов. Создавайте опросники, управляйте клиентами и генерируйте профессиональные PDF-отчёты.

---

## ✨ Возможности

- 🛠️ **Конструктор методик** — Визуальный builder для создания опросников без кода
- 📊 **Панель аналитики** — Детальная статистика по каждому тестированию с графиками
- 📄 **Генерация отчётов** — Автоматическое создание PDF-отчётов с интерпретацией
- 👥 **Управление клиентами** — База клиентов с историей всех тестирований
- 🔐 **Ролевая модель** — Разделение доступа: Администратор, Психолог, Клиент, Гость
- 💳 **Система подписок** — Тарифные планы для психологов
- 📱 **Адаптивный дизайн** — Полная поддержка мобильных устройств
- 🎨 **Тёмная тема** — Встроенный переключатель светлой/тёмной темы

---

## 🚀 Быстрый старт

### Требования

- Node.js 20+
- npm 10+
- PostgreSQL 15+ (для backend)
- Python 3.10+ (для backend-сервера)

### Установка

```bash
# Клонируйте репозиторий
git clone https://github.com/Fxshtro/profdnk.git
cd profdnk

# Установите frontend-зависимости
npm install

# Установите backend-зависимости
cd backend
python3 -m venv .venv
.venv\Scripts\activate  # Windows
# или
source .venv/bin/activate  # Linux/macOS
pip install -r requirements.txt
```

### Запуск в режиме разработки

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd backend
export PYTHONPATH=.
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Frontend:** [http://localhost:3000](http://localhost:3000)  
**Backend API:** [http://127.0.0.1:8000](http://127.0.0.1:8000)  
**API Документация:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 📖 Использование

### Роли пользователей

#### Гость
| Страница | Описание |
|----------|----------|
| `/` | Лендинг платформы с описанием возможностей |
| `/apply` | Заявка на регистрацию в качестве психолога |

#### Психолог
| Страница | Описание |
|----------|----------|
| `/login` | Авторизация в системе |
| `/dashboard` | Личный кабинет с общей статистикой |
| `/surveys` | Управление опросниками (создание, редактирование, удаление) |
| `/builder` | Визуальный конструктор методик |
| `/results` | Результаты тестирований клиентов |
| `/reports` | Генерация и просмотр отчётов |
| `/subscription` | Управление подпиской и тарифом |
| `/profile` | Настройки профиля пользователя |

#### Администратор
| Страница | Описание |
|----------|----------|
| `/admin/(auth)/login` | Вход в панель администратора |
| `/admin/applications` | Рассмотрение заявок на регистрацию психологов |
| `/admin/applications-request` | Запросы на рассмотрение заявок |
| `/admin/psychologists` | Управление аккаунтами психологов |
| `/admin/subscriptions` | Управление тарифными планами |

#### Клиент
| Страница | Описание |
|----------|----------|
| `/client/[surveyId]` | Прохождение теста по персональной ссылке |
| `/p/[token]` | Публичное прохождение опросника |

### Примеры рабочих процессов

| Сценарий | Шаги |
|----------|------|
| **Создание опросника** | Дашборд → Конструктор → Добавить вопросы → Сохранить → Сгенерировать ссылку |
| **Тестирование клиента** | Отправить ссылку → Клиент проходит → Просмотр результатов → Генерация отчёта |
| **Рассмотрение заявки** | Админ-панель → Заявки → Рассмотреть → Одобрить/Отклонить |

---

## 🏗️ Архитектура

```
┌─────────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Frontend (Next)   │ ───► │  Backend (FastAPI)│ ───► │  PostgreSQL DB   │
│   React 19 + TS     │      │  Python + Uvicorn │      │  + SQLite (opt)  │
└─────────────────────┘      └──────────────────┘      └───────────────────┘
         ▲                           ▲
         │                           │
    ┌──────────────┐          ┌──────────────┐
    │ TailwindCSS  │          │   JWT Auth   │
    │   Radix UI   │          │   CORS       │
    └──────────────┘          └──────────────┘
```

### Компоненты

| Компонент | Технология | Назначение |
|-----------|------------|------------|
| **Frontend** | Next.js 16 + React 19 | SSR/SSG, роутинг, UI-логика |
| **State Management** | TanStack Query | Кэширование и синхронизация API |
| **Формы** | React Hook Form + Zod | Валидация и управление формами |
| **UI Library** | Radix UI Primitives | Доступные компоненты |
| **Стилизация** | TailwindCSS v4 | Утилитарные CSS-классы |
| **Backend** | FastAPI (Python) | REST API, бизнес-логика |
| **База данных** | PostgreSQL / SQLite | Хранение данных |
| **Авторизация** | JWT | Токенная аутентификация |

### Типографика

- **Заголовки:** Unbounded (Google Fonts)
- **Основной текст:** Jost (Google Fonts)

---

## ⚙️ Настройка

### Переменные окружения (Backend)

Создайте файл `.env` в директории `backend/`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/profdnk
USE_SQLITE=false

JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

CORS_ORIGINS=http://localhost:3000,http://localhost:8080

INITIAL_ADMIN_EMAIL=admin@profdnk.ru
INITIAL_ADMIN_PASSWORD=admin123
INITIAL_ADMIN_FULL_NAME=Администратор
```

### PostgreSQL

**Установите** PostgreSQL 15+ и убедитесь, что служба запущена.

**Создайте базу данных** (имя должно совпадать с последним сегментом `DATABASE_URL`, по умолчанию `profdnk`):

```bash
psql -U postgres
```

```sql
CREATE DATABASE profdnk;
```

Выйдите из `psql` командой `\q` (или закройте терминал).

**Примените схему** из корня репозитория:

```bash
psql -U postgres -d profdnk -f "C:\profdnk-platform\backend\database\schema.sql"
```

Или из каталога `backend/`:

```bash
psql -U postgres -d profdnk -f database/schema.sql
```

**Удалите и пересоздайте** БД (например, после правок схемы или чистой переустановки). Сначала завершите активные подключения, если база используется:

```bash
psql -U postgres
```

```sql
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'profdnk' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS profdnk;
CREATE DATABASE profdnk;
```

Затем выйдите из `psql` (`\q`) и снова примените `schema.sql`, как выше.

> [!NOTE]
> **Не** добавляйте `?schema=public` в `DATABASE_URL`. Схема `public` в PostgreSQL используется по умолчанию, а `psycopg2` не принимает такой query-параметр и выдаёт ошибку подключения.

### Применение миграций

```bash
cd backend
python migrate.py
```

### Изменение подключения к БД

Отредактируйте `.env` в `backend/`:

```env
# Для PostgreSQL
DATABASE_URL=postgresql://user:password@host:port/database
USE_SQLITE=false

# Для SQLite (разработка)
DATABASE_URL=sqlite:///./dev.db
USE_SQLITE=true
```

---

## 🛠️ Устранение неполадок

### Ошибки подключения к БД

Убедитесь, что PostgreSQL запущен и параметры подключения верны:

```bash
# Проверка статуса PostgreSQL (Linux/macOS)
sudo systemctl status postgresql

# Проверка подключения
psql -U postgres -d profdnk -c "SELECT 1"
```

### CORS ошибки

Проверьте настройку `CORS_ORIGINS` в `.env` backend:

```env
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
```

### Проблемы с JWT

Убедитесь, что `JWT_SECRET_KEY` установлен и совпадает на frontend и backend.

### Конфликты портов

Если порт 3000 или 8000 занят, измените команды запуска:

```bash
# Frontend
PORT=3001 npm run dev

# Backend
uvicorn app.main:app --reload --port 8001
```

---

## 🤝 Вклад в проект

Вклад приветствуется! Вот как вы можете помочь:

1. Форкните репозиторий
2. Создайте ветку функции (`git checkout -b feature/amazing-feature`)
3. Зафиксируйте изменения (`git commit -m 'Add amazing feature'`)
4. Отправьте в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

Пожалуйста, прочитайте наш [Кодекс поведения](CODE_OF_CONDUCT.md) перед внесением вклада.

---

## 📄 Лицензия

Этот проект лицензирован по лицензии MIT — подробности см. в файле [LICENSE](LICENSE).

---

## 🙏 Благодарности

- [Next.js](https://nextjs.org/) за современный React-фреймворк
- [Radix UI](https://www.radix-ui.com/) за доступные UI-компоненты
- [TailwindCSS](https://tailwindcss.com/) за утилитарную стилизацию
- [FastAPI](https://fastapi.tiangolo.com/) за производительный backend
- [TanStack Query](https://tanstack.com/query) за управление серверным состоянием
- [Zod](https://zod.dev/) за валидацию с поддержкой TypeScript

---

## 📬 Контакты

- **Issues**: [GitHub Issues](https://github.com/Fxshtro/profdnk/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Fxshtro/profdnk/discussions)

---

## 👥 Команда

| Роль | Участник | Telegram |
|------|----------|----------|
| **Frontend-разработка** | Даниил | [@Fxshtro](https://t.me/Fxshtro) |
| **Backend-разработка** | Арсений | [@two_ghoul](https://t.me/two_ghoul) |
| **Manager** | Виктория | [@nyametado](https://t.me/nyametado) |

**Хакатон ДГТУ 2026**

---

<div align="center">

**Статус:** 🟢 Рабочий прототип (MVP)

**Создано с ❤️ для психологов и их клиентов**

[⬆ Наверх](#-profdnk--русский)

</div>
