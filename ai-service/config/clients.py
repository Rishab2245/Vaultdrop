from config.settings import settings

# OpenAI client — None if API key is missing
openai_client = None
try:
    if settings.openai_api_key and settings.openai_api_key != "sk-...":
        from openai import AsyncOpenAI
        openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
except Exception as e:
    print(f"[clients] OpenAI client init failed: {e}")

# Pinecone index — None if API key is missing or init fails
pinecone_index = None
try:
    if settings.pinecone_api_key and settings.pinecone_api_key != "...":
        from pinecone import Pinecone
        pc = Pinecone(api_key=settings.pinecone_api_key)
        pinecone_index = pc.Index(settings.pinecone_index_name)
except Exception as e:
    print(f"[clients] Pinecone client init failed: {e}")
