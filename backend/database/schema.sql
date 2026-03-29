-- PostgreSQL Database Schema for ProfDNK
-- Хакатон ТГАМТ ДГТУ 2026
-- Версия с INTEGER ID (совместима с SQLAlchemy моделями)

-- ============================================
-- USERS & AUTH
-- ============================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'PSYCHOLOGIST')),
    is_active BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    access_expires_at TIMESTAMP WITH TIME ZONE,
    about_md TEXT DEFAULT '',
    specialization TEXT NOT NULL DEFAULT '',
    photo_bytes BYTEA,
    photo_mime_type VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Если таблица users уже создана без specialization:
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS specialization TEXT NOT NULL DEFAULT '';

-- ============================================
-- TESTS (SURVEYS)
-- ============================================

CREATE TABLE tests (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    questions JSON NOT NULL,
    config_json JSONB,
    unique_token VARCHAR(64) UNIQUE NOT NULL,
    author_id INTEGER NOT NULL REFERENCES users(id),
    report_template_client_docx BYTEA,
    report_template_specialist_docx BYTEA,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tests_author ON tests(author_id);
CREATE INDEX idx_tests_token ON tests(unique_token);

-- ============================================
-- SUBMISSIONS
-- ============================================

CREATE TABLE submissions (
    id SERIAL PRIMARY KEY,
    test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    client_email VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(64),
    answers JSON NOT NULL,
    metrics JSONB,
    score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_submissions_test ON submissions(test_id);
CREATE INDEX idx_submissions_email ON submissions(client_email);

CREATE TABLE psychologist_registration_applications (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(64),
    specialization TEXT NOT NULL DEFAULT '',
    education TEXT NOT NULL DEFAULT '',
    experience TEXT NOT NULL DEFAULT '',
    comment TEXT NOT NULL DEFAULT '',
    status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_psych_reg_apps_email ON psychologist_registration_applications(email);
CREATE INDEX idx_psych_reg_apps_status ON psychologist_registration_applications(status);
