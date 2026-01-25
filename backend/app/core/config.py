from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Werewolf Game"
    REDIS_URL: str = "redis://redis:6379/0"
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Game Defaults
    # Game Defaults
    DEFAULT_PHASE_DURATION: int = 60

    # Version Info
    VERSION: str = "0.0.0"
    COMMIT_SHA: str = "unknown"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Attempt to populate from git if default/unknown
        if self.COMMIT_SHA == "unknown":
            try:
                import subprocess

                self.COMMIT_SHA = (
                    subprocess.check_output(
                        ["git", "rev-parse", "--short", "HEAD"], stderr=subprocess.DEVNULL
                    )
                    .decode("ascii")
                    .strip()
                )
            except Exception:
                pass

        if self.VERSION == "0.0.0":
            try:
                import subprocess

                self.VERSION = (
                    subprocess.check_output(
                        ["git", "describe", "--tags", "--always"], stderr=subprocess.DEVNULL
                    )
                    .decode("ascii")
                    .strip()
                )
            except Exception:
                pass


settings = Settings()
