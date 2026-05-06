from dataclasses import dataclass
import os


@dataclass
class Settings:
    app_name: str = os.getenv("APP_NAME", "AI Flood Intelligence System")
    env: str = os.getenv("APP_ENV", "development")
