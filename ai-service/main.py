from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import moderation, duplicate, scoring, pii

app = FastAPI(title="VAULT AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

app.include_router(moderation.router, prefix="/moderate", tags=["moderation"])
app.include_router(duplicate.router, prefix="/duplicate", tags=["duplicate"])
app.include_router(scoring.router, prefix="/score", tags=["scoring"])
app.include_router(pii.router, prefix="/pii", tags=["pii"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "vault-ai"}
