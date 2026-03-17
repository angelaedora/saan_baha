def embed_documents(documents: list[str]) -> list[list[float]]:
    # Placeholder deterministic embedding shape for pipeline wiring.
    return [[float(len(doc) % 100)] * 4 for doc in documents]
