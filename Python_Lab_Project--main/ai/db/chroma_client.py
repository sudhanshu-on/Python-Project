# Persistent ChromaDB client configuration and collection access.
import chromadb
from chromadb.config import Settings
import os

_client = None
_collection = None

COLLECTION_NAME = "clinical_notes"


def init_chroma():
    """Called once at startup from main.py lifespan."""
    global _client, _collection
    persist_path = os.getenv("CHROMA_PATH", "./chroma_store")
    _client = chromadb.PersistentClient(path=persist_path)
    _collection = _client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )
    return _collection


def get_collection():
    global _collection
    if _collection is None:
        init_chroma()
    return _collection


def get_client():
    global _client
    if _client is None:
        init_chroma()
    return _client