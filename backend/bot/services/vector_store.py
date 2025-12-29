# services/vector_store.py
import os
from typing import List, Dict, Any

from pinecone import Pinecone
from services.embeddings import embed_text, embed_texts


PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX")

pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(PINECONE_INDEX)


async def upsert_documents(
    ids: List[str],
    texts: List[str],
    metadata: List[Dict[str, Any]],
):
    """
    Store documents with embeddings in Pinecone.
    """
    vectors = await embed_texts(texts)

    payload = [
        {
            "id": ids[i],
            "values": vectors[i],
            "metadata": metadata[i],
        }
        for i in range(len(ids))
    ]

    index.upsert(vectors=payload)


async def semantic_search(
    query: str,
    top_k: int = 5,
    filters: Dict[str, Any] | None = None,
) -> List[Dict[str, Any]]:
    """
    Perform semantic search on Pinecone.
    """
    query_vector = await embed_text(query)

    response = index.query(
        vector=query_vector,
        top_k=top_k,
        include_metadata=True,
        filter=filters,
    )

    return [
        {
            "id": match["id"],
            "score": match["score"],
            "metadata": match.get("metadata", {}),
        }
        for match in response.get("matches", [])
    ]
