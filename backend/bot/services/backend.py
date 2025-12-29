# services/backend.py
import os
import httpx

BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:5000")


async def fetch_app_data(
    entity: str | None,
    fields: list | None,
    filters: dict | None,
    aggregation: dict | None,
    token: str,
) -> dict:
    """
    Executes structured queries against Node backend.
    NO NLP. NO hard-coded logic.
    """

    if not entity:
        return {"error": "Missing entity in intent"}

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    payload = {
        "entity": entity,
        "fields": fields,
        "filters": filters or {},
        "aggregation": aggregation,
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.post(
                f"{BACKEND_BASE_URL}/api/bot/query",
                json=payload,
                headers=headers,
            )
            res.raise_for_status()
            return res.json()

    except httpx.HTTPStatusError as e:
        print("❌ Backend HTTP error:", e.response.text)
        return {"error": "Backend responded with error"}

    except Exception as e:
        print("❌ Backend connection error:", str(e))
        return {"error": "Backend unreachable"}
