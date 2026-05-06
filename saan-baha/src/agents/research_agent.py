from src.rag.retriever import retrieve_context


def run_research(query: str) -> list[str]:
    return retrieve_context(query)
