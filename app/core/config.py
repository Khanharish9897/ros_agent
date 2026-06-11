from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Settings(BaseSettings):
    PROJECT_NAME: str = "ROS Agent"
    VERSION: str = "1.0.0"

    GROQ_API_KEY: str

    MONGODB_URI: str
    MONGODB_DB_NAME: str = "ros_agent"
    MONGODB_CHECKPOINT_COLLECTION: str = "langgraph_checkpoints"
    MONGODB_WRITES_COLLECTION: str = "langgraph_writes"

    LANGSMITH_TRACING: bool = False
    LANGSMITH_API_KEY: str | None = None
    LANGSMITH_PROJECT: str = "Ros Agent"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()