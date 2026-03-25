-- Миграция: Добавление полей experience_md и is_public в таблицу users
-- Хакатон ТГАМТ ДГТУ 2026

-- Добавляем поле experience_md (текст, по умолчанию пустая строка)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS experience_md TEXT DEFAULT '';

-- Добавляем поле is_public (булево, по умолчанию true)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

-- Комментарии к полям
COMMENT ON COLUMN users.experience_md IS 'Опыт работы психолога в формате Markdown';
COMMENT ON COLUMN users.is_public IS 'Видимость профиля в публичном каталоге';
