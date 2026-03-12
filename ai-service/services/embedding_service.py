from typing import List

_ZERO_VECTOR: List[float] = [0.0] * 1536
_MODEL = "text-embedding-3-small"


class EmbeddingService:
    async def embed(self, text: str) -> List[float]:
        from config.clients import openai_client

        if openai_client is None:
            return list(_ZERO_VECTOR)

        try:
            response = await openai_client.embeddings.create(
                model=_MODEL,
                input=text,
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"[EmbeddingService] Error: {e}")
            return list(_ZERO_VECTOR)
