from pathlib import Path


def load_documents(directory: str) -> list[str]:
    docs = []
    for path in Path(directory).glob("*.txt"):
        docs.append(path.read_text(encoding="utf-8"))
    return docs
