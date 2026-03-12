import json
from models.response_models import PIIRedactResponse
from utils.prompt_templates import PII_DETECTION_PROMPT


class PIIService:
    async def redact(self, text: str) -> PIIRedactResponse:
        from config.clients import openai_client

        if openai_client is None:
            return PIIRedactResponse(redacted_text=text, pii_found=[])

        try:
            prompt = PII_DETECTION_PROMPT.format(text=text)
            response = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
                response_format={"type": "json_object"},
            )

            raw = response.choices[0].message.content or "{}"
            data = json.loads(raw)

            redacted_text = data.get("redacted_text", text)
            pii_found = data.get("pii_found", [])

            if not isinstance(pii_found, list):
                pii_found = []

            return PIIRedactResponse(
                redacted_text=redacted_text,
                pii_found=pii_found,
            )

        except json.JSONDecodeError as e:
            print(f"[PIIService] JSON parse error: {e}")
            return PIIRedactResponse(redacted_text=text, pii_found=[])
        except Exception as e:
            print(f"[PIIService] Error: {e}")
            return PIIRedactResponse(redacted_text=text, pii_found=[])
