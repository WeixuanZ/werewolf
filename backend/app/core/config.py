import subprocess

from pydantic_settings import BaseSettings, SettingsConfigDict


def _git_output(*args: str) -> str | None:
    try:
        return (
            subprocess.check_output(["git", *args], stderr=subprocess.DEVNULL)
            .decode("ascii")
            .strip()
        )
    except (subprocess.SubprocessError, OSError):
        return None


class Settings(BaseSettings):
    PROJECT_NAME: str = "Werewolf Game"
    DEBUG: bool = False
    REDIS_URL: str = "redis://redis:6379/0"
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Game defaults
    DEFAULT_PHASE_DURATION: int = 60

    # Version info — overridable via env, with a git fallback for local dev.
    VERSION: str = "0.0.0"
    COMMIT_SHA: str = "unknown"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    def model_post_init(self, __context: object) -> None:
        if self.COMMIT_SHA == "unknown":
            self.COMMIT_SHA = _git_output("rev-parse", "--short", "HEAD") or self.COMMIT_SHA
        if self.VERSION == "0.0.0":
            self.VERSION = _git_output("describe", "--tags", "--always") or self.VERSION


settings = Settings()
