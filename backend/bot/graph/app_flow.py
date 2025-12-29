# graph/app_flow.py
from services.backend import fetch_app_data
from services.llm import generate_app_response


async def handle_app_query(intent: dict, user: dict):
    """
    Executes application (WMS) queries using structured intent.
    No NLP, no hard-coded business rules.
    """
    token = user["token"]

    # 1️⃣ Fetch raw data from Node backend
    raw_response = await fetch_app_data(
        entity=intent.get("entity"),
        fields=intent.get("fields"),
        filters=intent.get("filters"),
        aggregation=intent.get("aggregation"),
        token=token,
    )

    # 2️⃣ Normalize response (expects { data: [...] })
    normalized_data = {}

    if isinstance(raw_response, dict):
        if "data" in raw_response:
            normalized_data["data"] = raw_response["data"]
        else:
            normalized_data.update(raw_response)
    else:
        normalized_data["data"] = raw_response

    # 3️⃣ Generate final human-readable response
    reply = await generate_app_response(
        intent=intent,
        data=normalized_data,
    )

    return {
        "reply": reply,
        "data": normalized_data,
    }
