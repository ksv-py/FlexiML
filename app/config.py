from dotenv import load_dotenv
from pydantic_settings import BaseSettings
import os

load_dotenv()

class Settings(BaseSettings):
    mongo_uri: str = os.getenv("MONGO_URI")
    mongo_db: str = os.getenv("DB_NAME")

settings = Settings()