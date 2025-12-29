# services/embeddings.py
from typing import List
from services.llm import get_embedding_model


async def embed_text(text: str) -> List[float]:
    """
    Generate embedding vector for a single text.
    """
    model = get_embedding_model()
    return await model.embed_query(text)


async def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Generate embedding vectors for multiple texts.
    """
    model = get_embedding_model()
    return await model.embed_documents(texts)
