import json
from models.response_models import ScoreResponse
from utils.prompt_templates import EXPLOSIVE_SCORING_PROMPT

_FALLBACK = ScoreResponse(explosive_score=50.0, reasoning="Unable to score")


class ScoringService:
    async def score(
        self, text: str, category: str, hint_text: str | None = None
    ) -> ScoreResponse:
        from config.clients import openai_client

        if openai_client is None:
            return _FALLBACK

        try:
            prompt = EXPLOSIVE_SCORING_PROMPT.format(
                category=category,
                text=text,
                hint_text=hint_text or "N/A",
            )
            response = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                response_format={"type": "json_object"},
            )

            raw = response.choices[0].message.content or "{}"
            data = json.loads(raw)

            explosive_score = float(data.get("explosive_score", 50))
            reasoning = str(data.get("reasoning", "Unable to score"))

            # Clamp to 0-100
            explosive_score = max(0.0, min(100.0, explosive_score))

            return ScoreResponse(
                explosive_score=round(explosive_score, 2),
                reasoning=reasoning,
            )

        except json.JSONDecodeError as e:
            print(f"[ScoringService] JSON parse error: {e}")
            return _FALLBACK
        except Exception as e:
            print(f"[ScoringService] Error: {e}")
            return _FALLBACK
