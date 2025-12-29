# services/llm.py
import os
import json
import google.generativeai as genai
from metadata.app_metadata import APP_METADATA

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("models/gemini-2.5-flash")


async def call_llm(
    system_prompt: str, user_message: str, temperature: float = 0.5
) -> str:
    full_prompt = f"{system_prompt}\n\n{user_message}"
    try:
        response = model.generate_content(
            full_prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=temperature,
            ),
        )
        return response.text.strip()
    except Exception as e:
        print(f"LLM Error: {str(e)}")
        return ""


async def extract_intent(message: str) -> dict:
    """
    Extract structured intent with aggregation support.
    """

    system_prompt = f"""
You are an intent extraction engine for a Worker Management System.

Application metadata:
{APP_METADATA}

Your task:
- Classify the domain
- If application-related, extract:
  - entity
  - fields
  - filters
  - aggregation (IMPORTANT)

Aggregation rules (VERY IMPORTANT):
- Questions like:
  "most", "highest", "maximum", "largest" →
    aggregation = {{
      "type": "sum",
      "groupBy": "<relevantId>",
      "order": "desc",
      "limit": 1
    }}

- Questions like:
  "how many", "count" →
    aggregation = {{
      "type": "count"
    }}

- Questions like:
  "today", "present today" →
    filters must include today's date range

Rules:
- Do NOT hardcode values
- Infer everything from the query meaning
- Use application metadata to choose correct entity and groupBy field
- Return ONLY valid JSON
- No markdown
- No explanations

JSON format:
{{
  "domain": "greeting | agriculture | application",
  "entity": null | string,
  "fields": null | list,
  "filters": null | object,
  "aggregation": null | object
}}
"""

    response = await call_llm(
        system_prompt=system_prompt,
        user_message=f'User query: "{message}"',
        temperature=0.2,
    )

    try:
        intent = json.loads(response)
    except Exception:
        intent = {"domain": "unknown"}

    return intent


async def generate_agri_response(message: str) -> str:
    from prompts.agri_prompt import AGRI_SYSTEM_PROMPT

    return await call_llm(
        system_prompt=AGRI_SYSTEM_PROMPT,
        user_message=message,
        temperature=0.7,
    )


async def generate_app_response(intent: dict, data: dict) -> str:
    from prompts.app_prompt import APP_SYSTEM_PROMPT

    user_prompt = f"""
User intent:
{json.dumps(intent, indent=2)}

Data from system:
{json.dumps(data, indent=2)}

Instructions:
- Answer strictly based on the provided data
- Do not assume missing fields
- Be clear, concise, and farmer-friendly
"""

    return await call_llm(
        system_prompt=APP_SYSTEM_PROMPT,
        user_message=user_prompt,
        temperature=0.4,
    )
