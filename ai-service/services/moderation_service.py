from models.response_models import ModerateResponse

_FALLBACK = ModerateResponse(safe=True, score=0.8, flags=[])


class ModerationService:
    async def moderate(self, text: str) -> ModerateResponse:
        from config.clients import openai_client

        if openai_client is None:
            return _FALLBACK

        try:
            response = await openai_client.moderations.create(input=text)
            result = response.results[0]

            if result.flagged:
                # Collect names of flagged categories
                flags = [
                    category
                    for category, flagged in result.categories.__dict__.items()
                    if flagged
                ]
                # Score = 1.0 - max of all category scores
                all_scores = list(result.category_scores.__dict__.values())
                max_score = max(all_scores) if all_scores else 0.0
                score = max(0.0, 1.0 - max_score)
                return ModerateResponse(safe=False, score=round(score, 4), flags=flags)

            # Not flagged — still compute score from category scores
            all_scores = list(result.category_scores.__dict__.values())
            max_score = max(all_scores) if all_scores else 0.0
            score = max(0.0, 1.0 - max_score)
            return ModerateResponse(safe=True, score=round(score, 4), flags=[])

        except Exception as e:
            print(f"[ModerationService] Error: {e}")
            return _FALLBACK
