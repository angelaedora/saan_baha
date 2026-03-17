from src.rag.retriever import retrieve_context


def test_retrieve_context_returns_list() -> None:
    result = retrieve_context("urban flood mitigation")
    assert isinstance(result, list)
    assert result
