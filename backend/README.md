Системные требования

     - Python 3.10 или выше
     - PostgreSQL 15+ 

    Установка

    1. Создание виртуального окружения и установка зависимостей

     1 cd backend
     2 python3 -m venv .venv
     3 source .venv/bin/activate  # Linux/macOS
     4 # или
     5 .venv\Scripts\activate  # Windows
     6 pip install -r requirements.txt

    2. Настройка базы данных

     PostgreSQL

     3. Создайте базу данных:

     1 psql -U postgres
     2 CREATE DATABASE profdnk;
     3 \q

     4. Примените схему:

     1 psql -U postgres -d profdnk -f database/schema.sql



    3. Настройка переменных окружения

    Создайте файл .env в директории backend/:

      1 DATABASE_URL=postgresql://postgres:postgres@localhost:5432/profdnk
      2 USE_SQLITE=false
      3
      4 JWT_SECRET_KEY=your-secret-key-change-in-production
      5 JWT_ALGORITHM=HS256
      6 ACCESS_TOKEN_EXPIRE_MINUTES=1440
      7
      8 CORS_ORIGINS=http://localhost:3000,http://localhost:8080
      9
     10 INITIAL_ADMIN_EMAIL=admin@profdnk.ru
     11 INITIAL_ADMIN_PASSWORD=admin123
     12 INITIAL_ADMIN_FULL_NAME=Администратор

    Запуск сервера

     1 export PYTHONPATH=.
     2 uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

    Автоматический запуск (Linux/macOS)

     1 chmod +x run.sh
     2 ./run.sh

    Применение миграций

     1 python migrate.py

    Проверка работоспособности

     - Панель управления: http://127.0.0.1:8000/panel/
     - API документация: http://127.0.0.1:8000/docs
     - Health check: http://127.0.0.1:8000/api/health