from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    pinecone_api_key: str = ""
    pinecone_index_name: str = "vaultdrop-secrets"
    port: int = 8000

    class Config:
        env_file = ".env"


settings = Settings()
