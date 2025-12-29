# prompts/router_prompt.py

GREETING_RESPONSE = (
    "Hello! 👋 I'm your farm assistant.\n\n"
    "I can help you with:\n"
    "• Worker attendance & presence\n"
    "• Advances, extras & settlements\n"
    "• Payment summaries\n"
    "• Farming knowledge & advice\n\n"
    "What would you like to know?"
)


def handle_greeting() -> dict:
    """
    Return greeting response.
    No LLM, no classification.
    """
    return {
        "reply": GREETING_RESPONSE,
        "type": "greeting",
    }
