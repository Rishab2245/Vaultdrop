import re


def clean_text(text: str) -> str:
    """Normalize text for embedding/analysis."""
    text = text.strip()
    text = re.sub(r'\s+', ' ', text)
    text = text[:2000]  # truncate for API limits
    return text
