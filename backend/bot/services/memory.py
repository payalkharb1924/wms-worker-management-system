# services/memory.py
import os
from pinecone import Pinecone

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(os.getenv("PINECONE_INDEX"))


async def store_memory(farmer_id: str, text: str, embedding: list):
    index.upsert(
        vectors=[(f"{farmer_id}-{hash(text)}", embedding, {"farmer_id": farmer_id})],
        namespace=farmer_id,
    )


async def retrieve_memory(farmer_id: str, embedding: list, top_k: int = 3):
    result = index.query(
        vector=embedding,
        top_k=top_k,
        namespace=farmer_id,
        include_metadata=True,
    )
    return result.get("matches", [])
