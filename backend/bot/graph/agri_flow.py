# graph/agri_flow.py
from services.llm import generate_agri_response


async def handle_agri_query(message: str):
    """
    Handles agriculture knowledge queries
    """
    reply = await generate_agri_response(message)

    return {"reply": reply}
