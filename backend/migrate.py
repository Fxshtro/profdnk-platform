"""
Миграция БД: Добавление полей experience_md и is_public в таблицу users
Запуск: python migrate.py
"""
from sqlalchemy import create_engine, text

# Подключение к PostgreSQL
DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/profdnk"

def run_migration():
    print("Подключение к базе данных...")
    engine = create_engine(DATABASE_URL)
    
    try:
        with engine.connect() as conn:
            print("Добавление поля experience_md...")
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_md TEXT DEFAULT ''"
            ))
            
            print("Добавление поля is_public...")
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE"
            ))
            
            conn.commit()
            
        print("\n✅ Миграция выполнена успешно!")
        print("Добавлены поля:")
        print("  - experience_md (TEXT, DEFAULT '')")
        print("  - is_public (BOOLEAN, DEFAULT TRUE)")
        
    except Exception as e:
        print(f"\n❌ Ошибка миграции: {e}")
        raise

if __name__ == "__main__":
    run_migration()
