# graph/router.py
from graph.app_flow import handle_app_query
from graph.agri_flow import handle_agri_query
from services.llm import extract_intent


async def run_router(message: str, user: dict):
    """
    Routes user queries using structured intent extracted by LLM.
    No hard-coded keywords or rule-based matching.
    """

    # 1️⃣ Extract structured intent via LLM
    intent = await extract_intent(message)

    # Expected intent schema (example, NOT hard-coded logic):
    # {
    #   "domain": "application" | "agriculture" | "greeting" | "unknown",
    #   "action": "...",
    #   "entities": {...}
    # }

    domain = intent.get("domain")

    # 2️⃣ Greeting / small talk
    if domain == "greeting":
        return {
            "reply": (
                "Hello! 👋 Main aapka farm assistant hoon.\n\n"
                "Aap mujhse pooch sakte ho:\n"
                "• Aaj ka worker attendance\n"
                "• Kis worker ka advance ya settlement pending hai\n"
                "• Payment summaries & insights\n"
                "• Farming se related sawal\n\n"
                "Batayiye, main kya madad karoon?"
            )
        }

    # 3️⃣ WMS / application-related queries
    if domain == "application":
        return await handle_app_query(intent, user)

    # 4️⃣ Agriculture / farming knowledge queries
    if domain == "agriculture":
        return await handle_agri_query(message)

    # 5️⃣ Fallback (unknown / unclear intent)
    return {
        "reply": (
            "Mujhe thoda clear nahi hua 😅\n\n"
            "Aap workers, attendance, advances, settlements "
            "ya farming advice ke baare mein pooch sakte ho."
        )
    }
