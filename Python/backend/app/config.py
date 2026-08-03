from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "JwtAuth FastAPI"
    api_prefix: str = "/api"
    frontend_origin: str = "http://localhost:3000"
    database_url: str = "postgresql://postgres:postgres@localhost:5432/jwtauth_fastapi"
    jwt_secret: str = "replace-with-a-long-random-secret"
    jwt_issuer: str = "jwtauth-fastapi"
    jwt_audience: str = "jwtauth-clients"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    seed_admin: bool = True
    admin_email: str = "admin@demo.local"
    admin_password: str = "Admin@123"


settings = Settings()
