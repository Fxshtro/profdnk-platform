# PostgreSQL Database Setup

## Установка PostgreSQL

### Windows
1. Скачайте PostgreSQL с https://www.postgresql.org/download/windows/
2. Установите версию 15 или выше
3. Запомните пароль пользователя postgres

### macOS
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

## Создание базы данных

```bash
# Войдите в PostgreSQL
psql -U postgres

# Создайте базу данных
CREATE DATABASE profdnk;

# Создайте пользователя (опционально)
CREATE USER profdnk_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE profdnk TO profdnk_user;

# Выйдите
\q
```

## Применение миграций

```bash
# Примените схему
psql -U postgres -d profdnk -f backend/database/schema.sql
```

## Настройка .env

Создайте файл `.env` в папке `backend/`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/profdnk?schema=public
USE_SQLITE=false

JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

CORS_ORIGINS=http://localhost:3000,http://localhost:8080

INITIAL_ADMIN_EMAIL=admin@profdnk.ru
INITIAL_ADMIN_PASSWORD=admin123
INITIAL_ADMIN_FULL_NAME=Администратор
```

## Запуск бэкенда

```bash
cd backend
source .venv/bin/activate  # или .venv\Scripts\activate на Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Проверка подключения

Откройте http://localhost:8000/api/health

## Структура базы данных

### Таблицы:

1. **users** - Пользователи (админы и психологи)
2. **psychologist_applications** - Заявки на регистрацию
3. **subscriptions** - Подписки психологов
4. **surveys** - Опросники и тесты
5. **survey_submissions** - Результаты прохождений
6. **report_templates** - Шаблоны отчётов

### Индексы:
- По email для быстрого поиска пользователей
- По токену для быстрого доступа к тестам
- По статусу для фильтрации заявок
- По дате для сортировки результатов

## Бэкап и восстановление

```bash
# Бэкап
pg_dump -U postgres profdnk > backup.sql

# Восстановление
psql -U postgres profdnk < backup.sql
```
