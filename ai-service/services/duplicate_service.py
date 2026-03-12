from models.response_models import DuplicateCheckResponse
from services.embedding_service import EmbeddingService
from utils.text_cleaner import clean_text

_SIMILARITY_THRESHOLD = 0.92
_embedding_service = EmbeddingService()


class DuplicateService:
    async def check(
        self, text: str, secret_id: str, pool_date: str
    ) -> DuplicateCheckResponse:
        from config.clients import pinecone_index

        cleaned = clean_text(text)
        vector = await _embedding_service.embed(cleaned)

        if pinecone_index is None:
            return DuplicateCheckResponse(
                is_duplicate=False, similarity=0.0, nearest_id=None
            )

        try:
            query_response = pinecone_index.query(
                vector=vector,
                top_k=5,
                namespace=pool_date,
                include_metadata=True,
            )

            matches = query_response.get("matches", [])
            nearest_id: str | None = None
            similarity = 0.0
            is_duplicate = False

            if matches:
                top_match = matches[0]
                similarity = float(top_match.get("score", 0.0))
                nearest_id = top_match.get("id")
                if similarity > _SIMILARITY_THRESHOLD:
                    is_duplicate = True

            # Upsert current vector into the index
            pinecone_index.upsert(
                vectors=[
                    {
                        "id": secret_id,
                        "values": vector,
                        "metadata": {
                            "secret_id": secret_id,
                            "pool_date": pool_date,
                        },
                    }
                ],
                namespace=pool_date,
            )

            return DuplicateCheckResponse(
                is_duplicate=is_duplicate,
                similarity=round(similarity, 4),
                nearest_id=nearest_id if is_duplicate else None,
            )

        except Exception as e:
            print(f"[DuplicateService] Error: {e}")
            return DuplicateCheckResponse(
                is_duplicate=False, similarity=0.0, nearest_id=None
            )
