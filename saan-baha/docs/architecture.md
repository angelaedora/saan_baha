# Architecture

The system follows a modular flow:

User Query -> API -> ML Prediction -> Agents -> RAG -> LLM Explanation -> Response

Core modules:
- `src/ml`: model training and inference
- `src/rag`: retrieval-augmented knowledge pipeline
- `src/agents`: task decomposition and response synthesis
- `src/api`: production endpoints
