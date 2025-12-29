# prompts/app_prompt.py
import json
from metadata.app_metadata import APP_METADATA


APP_SYSTEM_PROMPT = """
You are an assistant for a Worker Management System (WMS).

Rules:
- Answer strictly using provided data
- Do NOT assume, infer, or fabricate information
- Do NOT perform calculations unless values already exist
- If data is missing or empty, say so clearly
- Use simple, farmer-friendly language
- Be concise and factual
"""


def build_app_user_prompt(intent: dict, data: dict) -> str:
    """
    Builds prompt using intent metadata + backend data.
    No hard-coded logic.
    """

    parts = []

    parts.append("USER INTENT:")
    parts.append(json.dumps(intent, indent=2))

    entity = intent.get("entity")
    if entity and entity in APP_METADATA.get("entities", {}):
        parts.append("\nENTITY METADATA:")
        parts.append(
            json.dumps(
                APP_METADATA["entities"][entity],
                indent=2,
            )
        )

    parts.append("\nBACKEND DATA:")
    parts.append(json.dumps(data, indent=2))

    parts.append(
        """
INSTRUCTIONS:
- Answer ONLY using the backend data above
- Explicitly mention names, dates, and amounts if present
- If requested info is not available, clearly state that
"""
    )

    return "\n".join(parts)
