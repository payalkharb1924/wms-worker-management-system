from services.llm import call_llm

AGRI_SYSTEM_PROMPT = """You are an agricultural expert assistant helping farmers with farming knowledge and advice.

You provide helpful information about:
- Crop selection and seasonal farming
- Soil preparation and fertilization
- Pest management and disease control
- Irrigation techniques
- Harvesting and storage tips
- Weather-related farming advice
- Farming best practices

Keep responses practical, specific to the question asked, and concise. When relevant, mention seasonal timing or local considerations."""


async def generate_agri_response(message: str) -> str:
    """
    Generate response for agriculture knowledge queries

    Args:
        message: User's agriculture-related query

    Returns:
        Agricultural advice or information
    """

    response = await call_llm(
        system_prompt=AGRI_SYSTEM_PROMPT, user_message=message, temperature=0.7
    )

    return response.strip()


AGRI_KEYWORDS = {
    "crops": [
        "wheat",
        "rice",
        "corn",
        "maize",
        "cotton",
        "sugarcane",
        "potato",
        "onion",
        "tomato",
        "pepper",
    ],
    "farming_techniques": [
        "irrigation",
        "fertilizer",
        "soil",
        "plowing",
        "sowing",
        "harvesting",
        "composting",
    ],
    "pest_disease": [
        "pest",
        "disease",
        "insect",
        "fungal",
        "bacterial",
        "leaf",
        "blight",
        "rust",
        "rot",
    ],
    "weather": [
        "rain",
        "drought",
        "temperature",
        "frost",
        "weather",
        "season",
        "monsoon",
    ],
    "general": ["farming", "agriculture", "crop", "field", "farm", "harvest", "yield"],
}


def is_agriculture_query(message: str) -> bool:
    """
    Quick check if message contains agriculture-related keywords
    """
    message_lower = message.lower()

    for category, keywords in AGRI_KEYWORDS.items():
        if any(keyword in message_lower for keyword in keywords):
            return True

    return False
