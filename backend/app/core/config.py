from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/profdnk?schema=public"
    use_sqlite: bool = False
    sqlite_path: str = "app.db"

    # JWT
    secret_key: str = "change_me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # CORS
    cors_origins: str = "http://localhost:3000"

    # Admin
    initial_admin_email: str | None = None
    initial_admin_password: str | None = None
    initial_admin_full_name: str = "Администратор"

    # Rate limiting
    rate_limit_per_minute: int = 60

    @property
    def sqlalchemy_database_uri(self) -> str:
        if self.use_sqlite:
            return f"sqlite:///{self.sqlite_path}"
        return self.database_url


settings = Settings()
